package com.equinox.bank.advice;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.equinox.bank.exception.BusinessException;
import com.equinox.bank.exception.DuplicateResourceException;
import com.equinox.bank.exception.ResourceNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, String>> handleDuplicate(DuplicateResourceException ex) {
        log.error("Duplicate resource: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, String>> handleBusiness(BusinessException ex) {
        log.error("Business error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        log.error("Validation failed: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        log.error("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("Data integrity violation", ex);

        String msg = extractUserFriendlyMessage(ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", msg));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        log.error("Unhandled runtime exception", ex);

        String msg = ex.getMessage();
        if (msg != null && msg.toLowerCase().contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", msg));
        }
        if (msg != null && msg.toLowerCase().contains("unauthorized")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", msg));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", msg != null ? msg : "An error occurred"));
    }

    private String extractUserFriendlyMessage(DataIntegrityViolationException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "";

        Pattern pattern = Pattern.compile("value too long for type character varying\\((\\d+)\\)");
        Matcher matcher = pattern.matcher(message);
        if (matcher.find()) {
            String maxLength = matcher.group(1);
            return "Value too long — maximum length is " + maxLength + " characters";
        }

        if (message.contains("not-null")) {
            return "A required field is missing";
        }

        if (message.contains("duplicate key") || message.contains("unique constraint")) {
            return "A record with this value already exists";
        }

        return "A database constraint was violated";
    }
}
