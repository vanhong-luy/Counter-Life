package com.equinox.admin.service;

import com.equinox.admin.dto.TelemetryResponse;
import com.equinox.admin.dto.TelemetryResponse.BenchmarkQuery;
import com.equinox.admin.dto.TelemetryResponse.TableStat;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class TelemetryService {

    private final EntityManager em;
    private final MongoTemplate mongo;

    private static final List<String> PG_TABLES = List.of(
        "customers", "accounts", "transactions", "cards", "card_limits",
        "loans", "loan_repayments", "kyc_documents", "collaterals", "refunds",
        "card_transactions", "card_statements", "card_status_history",
        "credit_score_tiers", "admin_users", "admin_roles",
        "account_types", "transaction_types", "transaction_categories", "card_types", "loan_types",
        "customer_bills", "credit_limit_requests", "fixed_deposit_rates", "savings_goals"
    );

    private static final List<String> MONGO_COLLECTIONS = List.of("audit_logs", "monthly_analytics");

    public TelemetryService(EntityManager em, MongoTemplate mongo) {
        this.em = em;
        this.mongo = mongo;
    }

    // Telemetry is a live diagnostic tool — deliberately NOT cached so the
    // page always reflects current DB state (row counts, query benchmarks).
    public TelemetryResponse collect() {
        TelemetryResponse res = new TelemetryResponse();
        res.setTimestamp(Instant.now().toString());
        res.setPostgres(collectPgStats());
        res.setMongodb(collectMongoStats());
        res.setSummary(buildSummary(res.getPostgres(), res.getMongodb()));
        res.setBenchmarks(runBenchmarks());
        return res;
    }

    private List<TableStat> collectPgStats() {
        List<TableStat> stats = new ArrayList<>();
        for (String table : PG_TABLES) {
            long start = System.nanoTime();
            try {
                jakarta.persistence.Query q = em.createNativeQuery("SELECT count(*) FROM \"" + table + "\"");
                Number count = (Number) q.getSingleResult();
                long elapsed = (System.nanoTime() - start) / 1_000_000;
                stats.add(new TableStat(table, count.longValue(), elapsed));
            } catch (Exception e) {
                stats.add(new TableStat(table, -1, (System.nanoTime() - start) / 1_000_000));
            }
        }
        return stats;
    }

    private List<TableStat> collectMongoStats() {
        List<TableStat> stats = new ArrayList<>();
        for (String coll : MONGO_COLLECTIONS) {
            long start = System.nanoTime();
            try {
                long count = mongo.getCollection(coll).countDocuments();
                long elapsed = (System.nanoTime() - start) / 1_000_000;
                stats.add(new TableStat(coll, count, elapsed));
            } catch (Exception e) {
                stats.add(new TableStat(coll, -1, (System.nanoTime() - start) / 1_000_000));
            }
        }
        return stats;
    }

    private Map<String, Object> buildSummary(List<TableStat> pgStats, List<TableStat> mongoStats) {
        long pgTotalRows = 0, pgTotalTime = 0;
        for (TableStat s : pgStats) {
            if (s.getCount() >= 0) pgTotalRows += s.getCount();
            pgTotalTime += s.getQueryTimeMs();
        }
        long mongoTotalDocs = 0, mongoTotalTime = 0;
        for (TableStat s : mongoStats) {
            if (s.getCount() >= 0) mongoTotalDocs += s.getCount();
            mongoTotalTime += s.getQueryTimeMs();
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("pgTables", pgStats.size());
        summary.put("pgTotalRows", pgTotalRows);
        summary.put("pgTotalQueryTimeMs", pgTotalTime);
        summary.put("mongoCollections", mongoStats.size());
        summary.put("mongoTotalDocs", mongoTotalDocs);
        summary.put("mongoTotalQueryTimeMs", mongoTotalTime);
        return summary;
    }

    private List<BenchmarkQuery> runBenchmarks() {
        List<BenchmarkQuery> results = new ArrayList<>();

        // 1. Recent transactions (ordered scan)
        results.add(measure("Recent 50 transactions",
            "SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT 50"));

        // 2. Aggregation on transactions
        results.add(measure("Transaction aggregation (SUM, AVG, COUNT)",
            "SELECT type_id, COUNT(*) as cnt, ROUND(AVG(amount)::numeric, 2) as avg_amt, ROUND(SUM(amount)::numeric, 2) as total FROM transactions GROUP BY type_id"));

        // 3. Join: customers + accounts
        results.add(measure("Customers JOIN accounts (top 50)",
            "SELECT c.customer_id, c.first_name, c.last_name, COUNT(a.account_id) as acct_count, ROUND(SUM(a.balance)::numeric, 2) as total_balance FROM customers c LEFT JOIN accounts a ON c.customer_id = a.customer_id GROUP BY c.customer_id, c.first_name, c.last_name LIMIT 50"));

        // 4. Indexed lookup on transactions
        results.add(measure("Indexed lookup (transactions by source_account_id)",
            "SELECT * FROM transactions WHERE source_account_id = 1 LIMIT 50"));

        // 5. Range scan on transaction date
        results.add(measure("Date range scan (transactions last 30 days)",
            "SELECT COUNT(*) FROM transactions WHERE transaction_date >= NOW() - INTERVAL '30 days'"));

        // 6. Full table scan: customers with KYC filter
        results.add(measure("Filtered scan (customers by kyc_status)",
            "SELECT kyc_status, COUNT(*) FROM customers GROUP BY kyc_status"));

        // 7. Loan with customer join
        results.add(measure("Loans JOIN customers (top 50)",
            "SELECT l.loan_id, l.principal_amount, l.status, c.first_name, c.last_name, c.credit_score FROM loans l JOIN customers c ON l.customer_id = c.customer_id WHERE l.status IN ('active', 'pending') ORDER BY l.principal_amount DESC LIMIT 50"));

        // 8. MongoDB sample find
        results.add(measureMongo("MongoDB: recent 50 audit_logs",
            "audit_logs", "db.audit_logs.find().sort({timestamp:-1}).limit(50)"));

        return results;
    }

    private BenchmarkQuery measure(String name, String sql) {
        long start = System.nanoTime();
        try {
            jakarta.persistence.Query q = em.createNativeQuery(sql);
            int count = q.getResultList().size();
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            return new BenchmarkQuery(name, sql, count, elapsed);
        } catch (Exception e) {
            return new BenchmarkQuery(name, sql + " [ERROR: " + e.getMessage() + "]", 0, (System.nanoTime() - start) / 1_000_000);
        }
    }

    private BenchmarkQuery measureMongo(String name, String collection, String queryDesc) {
        long start = System.nanoTime();
        try {
            Query q = new Query().limit(50).with(Sort.by(Sort.Direction.DESC, "timestamp"));
            List<?> docs = mongo.find(q, LinkedHashMap.class, collection);
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            return new BenchmarkQuery(name, queryDesc, docs.size(), elapsed);
        } catch (Exception e) {
            return new BenchmarkQuery(name, queryDesc + " [ERROR: " + e.getMessage() + "]", 0, (System.nanoTime() - start) / 1_000_000);
        }
    }
}
