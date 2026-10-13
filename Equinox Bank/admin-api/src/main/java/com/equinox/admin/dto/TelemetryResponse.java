package com.equinox.admin.dto;

import java.util.List;
import java.util.Map;

public class TelemetryResponse {

    private String timestamp;
    private Map<String, Object> summary;
    private List<TableStat> postgres;
    private List<TableStat> mongodb;
    private List<BenchmarkQuery> benchmarks;

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public Map<String, Object> getSummary() { return summary; }
    public void setSummary(Map<String, Object> summary) { this.summary = summary; }

    public List<TableStat> getPostgres() { return postgres; }
    public void setPostgres(List<TableStat> postgres) { this.postgres = postgres; }

    public List<TableStat> getMongodb() { return mongodb; }
    public void setMongodb(List<TableStat> mongodb) { this.mongodb = mongodb; }

    public List<BenchmarkQuery> getBenchmarks() { return benchmarks; }
    public void setBenchmarks(List<BenchmarkQuery> benchmarks) { this.benchmarks = benchmarks; }

    public static class TableStat {
        private String table;
        private long count;
        private long queryTimeMs;

        public TableStat() {}
        public TableStat(String table, long count, long queryTimeMs) {
            this.table = table;
            this.count = count;
            this.queryTimeMs = queryTimeMs;
        }

        public String getTable() { return table; }
        public void setTable(String table) { this.table = table; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public long getQueryTimeMs() { return queryTimeMs; }
        public void setQueryTimeMs(long queryTimeMs) { this.queryTimeMs = queryTimeMs; }
    }

    public static class BenchmarkQuery {
        private String name;
        private String query;
        private long resultCount;
        private long queryTimeMs;

        public BenchmarkQuery() {}
        public BenchmarkQuery(String name, String query, long resultCount, long queryTimeMs) {
            this.name = name;
            this.query = query;
            this.resultCount = resultCount;
            this.queryTimeMs = queryTimeMs;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getQuery() { return query; }
        public void setQuery(String query) { this.query = query; }
        public long getResultCount() { return resultCount; }
        public void setResultCount(long resultCount) { this.resultCount = resultCount; }
        public long getQueryTimeMs() { return queryTimeMs; }
        public void setQueryTimeMs(long queryTimeMs) { this.queryTimeMs = queryTimeMs; }
    }
}
