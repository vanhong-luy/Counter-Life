package com.equinox.admin.service;

import com.equinox.admin.dto.*;
import com.equinox.admin.entity.*;
import com.equinox.admin.exception.BusinessException;
import com.equinox.admin.exception.ResourceNotFoundException;
import com.equinox.admin.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminCardService {

    private final CardRepository cardRepository;
    private final CreditLimitRequestRepository creditLimitRequestRepository;
    private final AdminUserRepository adminUserRepository;

    public AdminCardService(CardRepository cardRepository,
                            CreditLimitRequestRepository creditLimitRequestRepository,
                            AdminUserRepository adminUserRepository) {
        this.cardRepository = cardRepository;
        this.creditLimitRequestRepository = creditLimitRequestRepository;
        this.adminUserRepository = adminUserRepository;
    }

    public Map<String, Object> getFilteredCards(String search, String filter, int limit, int offset) {
        if (search != null && search.isBlank()) search = null;
        Boolean frozen = "FROZEN".equalsIgnoreCase(filter) ? Boolean.TRUE : null;
        Boolean hasPendingReq = "PENDING_REQUESTS".equalsIgnoreCase(filter) ? Boolean.TRUE : null;

        PageRequest page = PageRequest.of(offset / limit, limit);
        List<Card> cards = cardRepository.findFilteredAdvanced(search, frozen, hasPendingReq, page);
        long total = cardRepository.countFilteredAdvanced(search, frozen, hasPendingReq);

        List<CardResponse> items = cards.stream().map(this::toCardResponse).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("cards", items);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        return result;
    }

    public CardResponse getCardById(Long cardId) {
        Card card = cardRepository.findByIdWithDetails(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found"));
        return toCardResponse(card);
    }

    public List<CreditLimitRequestResponse> getCreditRequests(String statusFilter) {
        List<CreditLimitRequest> requests;
        if (statusFilter != null && !"ALL".equalsIgnoreCase(statusFilter)) {
            requests = creditLimitRequestRepository.findByStatusWithDetails(statusFilter.toUpperCase());
        } else {
            requests = creditLimitRequestRepository.findAllWithDetails();
        }
        return requests.stream().map(this::toCreditLimitRequestResponse).collect(Collectors.toList());
    }

    public List<CreditLimitRequestResponse> getCreditRequestsByCard(Long cardId) {
        return creditLimitRequestRepository.findByCard_CardId(cardId).stream()
                .map(this::toCreditLimitRequestResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CreditLimitRequestResponse reviewCreditRequest(Long requestId, CreditLimitReviewRequest reviewReq, Long adminId) {
        CreditLimitRequest request = creditLimitRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Credit limit request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessException("Request has already been reviewed");
        }

        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        boolean approved = "APPROVED".equalsIgnoreCase(reviewReq.getStatus());

        request.setStatus(approved ? "APPROVED" : "REJECTED");
        request.setAdmin(admin);
        request.setAdminNotes(reviewReq.getAdminNotes());
        request.setReviewedAt(OffsetDateTime.now());

        if (approved) {
            Card card = request.getCard();
            card.setCreditLimit(request.getRequestedLimit());
            cardRepository.save(card);
        }

        CreditLimitRequest saved = creditLimitRequestRepository.save(request);
        return toCreditLimitRequestResponse(saved);
    }

    @Transactional
    public CardResponse overrideCard(Long cardId, CardOverrideRequest overrideReq) {
        Card card = cardRepository.findByIdWithDetails(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found"));

        if (overrideReq.getApr() != null) {
            card.setApr(overrideReq.getApr());
        }
        if (overrideReq.getCreditLimit() != null) {
            card.setCreditLimit(overrideReq.getCreditLimit());
        }

        Card saved = cardRepository.save(card);
        return toCardResponse(saved);
    }

    @Transactional
    public CardResponse adjustBalance(Long cardId, BalanceAdjustRequest adjustReq) {
        Card card = cardRepository.findByIdWithDetails(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found"));

        BigDecimal newBalance = card.getOutstandingBalance().add(adjustReq.getAmount());
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Balance adjustment would make outstanding balance negative");
        }
        card.setOutstandingBalance(newBalance);
        Card saved = cardRepository.save(card);
        return toCardResponse(saved);
    }

    private CardResponse toCardResponse(Card card) {
        String cardNumber = "************" + card.getCardNumber().substring(Math.max(0, card.getCardNumber().length() - 4));
        String customerName = card.getAccount().getCustomer().getFirstName()
                + " " + card.getAccount().getCustomer().getLastName();
        return new CardResponse(
                card.getCardId(),
                card.getAccount().getAccountId(),
                card.getAccount().getName(),
                card.getAccount().getCustomer().getCustomerId(),
                customerName,
                card.getAccount().getCustomer().getEmail(),
                card.getCardType().getNetwork(),
                card.getCardType().getTypeName(),
                cardNumber,
                customerName,
                card.getExpiryDate(),
                card.getIsFrozen(),
                card.getIssuedAt(),
                card.getCreditLimit(),
                card.getOutstandingBalance(),
                card.getApr(),
                card.getStatementDate(),
                card.getDueDate()
        );
    }

    private CreditLimitRequestResponse toCreditLimitRequestResponse(CreditLimitRequest req) {
        String cardNumber = "************" + req.getCard().getCardNumber().substring(Math.max(0, req.getCard().getCardNumber().length() - 4));
        String customerName = req.getCard().getAccount().getCustomer().getFirstName()
                + " " + req.getCard().getAccount().getCustomer().getLastName();
        return new CreditLimitRequestResponse(
                req.getRequestId(),
                req.getCard().getCardId(),
                cardNumber,
                req.getCard().getAccount().getCustomer().getCustomerId(),
                customerName,
                req.getCurrentLimit(),
                req.getRequestedLimit(),
                req.getReason(),
                req.getStatus(),
                req.getAdmin() != null ? req.getAdmin().getAdminId() : null,
                req.getAdmin() != null ? req.getAdmin().getEmail() : null,
                req.getAdminNotes(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
