package com.equinox.bank.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.CardIssueRequestDTO;
import com.equinox.bank.dto.CardLimitResponseDTO;
import com.equinox.bank.dto.CardLimitUpdateRequestDTO;
import com.equinox.bank.dto.CardPurchaseRequestDTO;
import com.equinox.bank.dto.CardResponseDTO;
import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CreditLimitRequest;
import com.equinox.bank.repository.CardRepository;
import com.equinox.bank.repository.CardTypeRepository;
import com.equinox.bank.repository.CreditLimitRequestRepository;
import com.equinox.bank.service.CardService;
import com.equinox.bank.service.CreditCardService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/cards")
public class CardController {

    private final CardService cardService;
    private final CreditCardService creditCardService;
    private final CreditLimitRequestRepository creditLimitRequestRepository;
    private final CardRepository cardRepository;
    private final CardTypeRepository cardTypeRepository;

    @Autowired
    public CardController(CardService cardService, CreditCardService creditCardService,
                          CreditLimitRequestRepository creditLimitRequestRepository,
                          CardRepository cardRepository, CardTypeRepository cardTypeRepository) {
        this.cardService = cardService;
        this.creditCardService = creditCardService;
        this.creditLimitRequestRepository = creditLimitRequestRepository;
        this.cardRepository = cardRepository;
        this.cardTypeRepository = cardTypeRepository;
    }

    @GetMapping("/types")
    public ResponseEntity<List<java.util.Map<String, Object>>> getCardTypes() {
        return ResponseEntity.ok(cardTypeRepository.findAll().stream()
                .map(ct -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("cardTypeId", ct.getCardTypeId());
                    m.put("network", ct.getNetwork());
                    m.put("typeName", ct.getTypeName());
                    m.put("defaultApr", ct.getDefaultApr());
                    m.put("lateFee", ct.getLateFee());
                    return m;
                })
                .toList());
    }

    @PostMapping("/issue")
    public ResponseEntity<CardResponseDTO> issueCard(Authentication authentication,
                                                     @Valid @RequestBody CardIssueRequestDTO dto) {
        CardResponseDTO response = cardService.issueCard(authentication.getName(), dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<CardResponseDTO>> getCustomerCards(Authentication authentication) {
        return ResponseEntity.ok(cardService.getCustomerCards(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CardResponseDTO> getCard(Authentication authentication,
                                                   @PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCard(authentication.getName(), id));
    }

    @PutMapping("/{id}/freeze")
    public ResponseEntity<CardResponseDTO> freezeCard(Authentication authentication,
                                                      @PathVariable Long id) {
        return ResponseEntity.ok(cardService.freezeCard(authentication.getName(), id));
    }

    @PutMapping("/{id}/unfreeze")
    public ResponseEntity<CardResponseDTO> unfreezeCard(Authentication authentication,
                                                        @PathVariable Long id) {
        return ResponseEntity.ok(cardService.unfreezeCard(authentication.getName(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<CardResponseDTO> deactivateCard(Authentication authentication,
                                                          @PathVariable Long id) {
        return ResponseEntity.ok(cardService.deactivateCard(authentication.getName(), id));
    }

    @PutMapping("/{id}/limits")
    public ResponseEntity<CardLimitResponseDTO> updateCardLimits(Authentication authentication,
                                                                  @PathVariable Long id,
                                                                  @Valid @RequestBody CardLimitUpdateRequestDTO dto) {
        return ResponseEntity.ok(cardService.updateCardLimits(authentication.getName(), id, dto));
    }

    @GetMapping("/{id}/limits")
    public ResponseEntity<CardLimitResponseDTO> getCardLimits(Authentication authentication,
                                                              @PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCardLimits(authentication.getName(), id));
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<?> getCardTransactions(Authentication authentication,
                                                  @PathVariable Long id,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "50") int size) {
        if (page >= 0) {
            return ResponseEntity.ok(cardService.getCardTransactionsPaginated(authentication.getName(), id, page, size));
        }
        return ResponseEntity.ok(cardService.getCardTransactions(authentication.getName(), id));
    }

    @PostMapping("/{id}/purchase")
    public ResponseEntity<Map<String, Object>> simulatePurchase(Authentication authentication,
                                                                  @PathVariable Long id,
                                                                  @Valid @RequestBody CardPurchaseRequestDTO dto) {
        return ResponseEntity.ok(cardService.simulatePurchase(authentication.getName(), id, dto));
    }

    // ── Credit Card endpoints ──────────────────────────────────────────

    @GetMapping("/{id}/credit")
    public ResponseEntity<Map<String, Object>> getCreditInfo(Authentication auth,
                                                              @PathVariable Long id) {
        return ResponseEntity.ok(creditCardService.getCreditCardInfo(id, auth.getName()));
    }

    @PostMapping("/{id}/debit/purchase")
    public ResponseEntity<Map<String, Object>> debitPurchase(Authentication auth,
                                                              @PathVariable Long id,
                                                              @RequestBody Map<String, Object> body) {
        BigDecimal amount = BigDecimal.valueOf(Double.parseDouble(body.get("amount").toString()));
        String merchant = (String) body.getOrDefault("merchant", "");
        String description = (String) body.getOrDefault("description", "");
        return ResponseEntity.ok(cardService.debitPurchase(auth.getName(), id, amount, merchant, description));
    }

    @PostMapping("/{id}/credit/purchase")
    public ResponseEntity<Map<String, Object>> purchase(Authentication auth,
                                                         @PathVariable Long id,
                                                         @RequestBody Map<String, Object> body) {
        BigDecimal amount = BigDecimal.valueOf(Double.parseDouble(body.get("amount").toString()));
        String merchant = (String) body.getOrDefault("merchant", "");
        String description = (String) body.getOrDefault("description", "");
        return ResponseEntity.ok(creditCardService.purchase(id, auth.getName(), amount, merchant, description));
    }

    @PostMapping("/{id}/credit/pay")
    public ResponseEntity<Map<String, Object>> payCard(Authentication auth,
                                                        @PathVariable Long id,
                                                        @RequestBody Map<String, Object> body) {
        Long fromAccountId = Long.valueOf(body.get("fromAccountId").toString());
        BigDecimal amount = BigDecimal.valueOf(Double.parseDouble(body.get("amount").toString()));
        return ResponseEntity.ok(creditCardService.payCard(id, auth.getName(), fromAccountId, amount));
    }

    @GetMapping("/{id}/credit/statements")
    public ResponseEntity<List<Map<String, Object>>> getStatements(Authentication auth,
                                                                     @PathVariable Long id) {
        return ResponseEntity.ok(creditCardService.getStatements(id, auth.getName()));
    }

    @PostMapping("/{id}/credit/request-limit")
    public ResponseEntity<Map<String, Object>> requestLimitIncrease(Authentication auth,
                                                                      @PathVariable Long id,
                                                                      @RequestBody Map<String, Object> body) {
        BigDecimal requestedLimit = BigDecimal.valueOf(Double.parseDouble(body.get("requestedLimit").toString()));
        String reason = (String) body.getOrDefault("reason", "");

        Card card = cardRepository.findByIdWithAccount(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(auth.getName())) {
            throw new RuntimeException("Unauthorized access to card");
        }
        if (card.getCreditLimit() == null) {
            throw new RuntimeException("Not a credit card");
        }

        List<CreditLimitRequest> existing = creditLimitRequestRepository.findByCard_CardIdOrderByCreatedAtDesc(id);
        if (existing.stream().anyMatch(r -> "PENDING".equalsIgnoreCase(r.getStatus()))) {
            throw new RuntimeException("You already have an active pending limit increase request under review.");
        }

        CreditLimitRequest req = new CreditLimitRequest();
        req.setCard(card);
        req.setCurrentLimit(card.getCreditLimit());
        req.setRequestedLimit(requestedLimit);
        req.setReason(reason);
        creditLimitRequestRepository.save(req);

        return ResponseEntity.ok(Map.of(
            "requestId", req.getRequestId(),
            "status", "PENDING",
            "message", "Credit limit increase request submitted for review"
        ));
    }
}
