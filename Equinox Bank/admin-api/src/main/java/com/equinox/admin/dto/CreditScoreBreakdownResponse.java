package com.equinox.admin.dto;

import java.util.List;

public class CreditScoreBreakdownResponse {

    public static class Factor {
        private String name;
        private int points;
        private boolean isPositive;
        private String detail;

        public Factor(String name, int points, boolean isPositive, String detail) {
            this.name = name;
            this.points = points;
            this.isPositive = isPositive;
            this.detail = detail;
        }

        public String getName() { return name; }
        public int getPoints() { return points; }
        public boolean isPositive() { return isPositive; }
        public String getDetail() { return detail; }
    }

    private int finalScore;
    private List<Factor> factors;

    public CreditScoreBreakdownResponse(int finalScore, List<Factor> factors) {
        this.finalScore = finalScore;
        this.factors = factors;
    }

    public int getFinalScore() { return finalScore; }
    public List<Factor> getFactors() { return factors; }
}
