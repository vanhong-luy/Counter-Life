package com.equinox.bank.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class SeedSimulationRequest {

    @Min(1) @Max(2000)
    private int batchSize = 50;

    private boolean skipCardPurchases = false;

    // --- Account rates ---
    @Min(0) @Max(100) private int savingsAccountRate = 50;
    @Min(0) @Max(100) private int fixedDepositRate = 50;

    // --- Card rates ---
    @Min(0) @Max(100) private int creditCardRate = 30;

    // --- KYC rates (must sum to 100) ---
    @Min(0) @Max(100) private int kycApproveRate = 70;
    @Min(0) @Max(100) private int kycRejectRate = 10;

    // --- Action rates ---
    @Min(0) @Max(100) private int withdrawalRate = 40;
    @Min(0) @Max(100) private int transferRate = 50;
    @Min(0) @Max(100) private int loanApplyRate = 60;
    @Min(0) @Max(100) private int collateralRate = 40;
    @Min(0) @Max(100) private int refundRate = 30;
    @Min(0) @Max(100) private int creditPayRate = 30;

    // --- Loan approval rates (must sum to 100) ---
    @Min(0) @Max(100) private int loanApproveRate = 60;
    @Min(0) @Max(100) private int loanRejectRate = 20;

    // --- Loan repayment rates (must sum to 100) ---
    @Min(0) @Max(100) private int repayFullRate = 30;
    @Min(0) @Max(100) private int repayPartialRate = 40;

    // --- Getters ---
    public int getBatchSize() { return batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }

    public boolean isSkipCardPurchases() { return skipCardPurchases; }
    public void setSkipCardPurchases(boolean skipCardPurchases) { this.skipCardPurchases = skipCardPurchases; }

    public int getSavingsAccountRate() { return savingsAccountRate; }
    public void setSavingsAccountRate(int savingsAccountRate) { this.savingsAccountRate = savingsAccountRate; }

    public int getFixedDepositRate() { return fixedDepositRate; }
    public void setFixedDepositRate(int fixedDepositRate) { this.fixedDepositRate = fixedDepositRate; }

    public int getCreditCardRate() { return creditCardRate; }
    public void setCreditCardRate(int creditCardRate) { this.creditCardRate = creditCardRate; }

    public int getKycApproveRate() { return kycApproveRate; }
    public void setKycApproveRate(int kycApproveRate) { this.kycApproveRate = kycApproveRate; }

    public int getKycRejectRate() { return kycRejectRate; }
    public void setKycRejectRate(int kycRejectRate) { this.kycRejectRate = kycRejectRate; }

    public int getWithdrawalRate() { return withdrawalRate; }
    public void setWithdrawalRate(int withdrawalRate) { this.withdrawalRate = withdrawalRate; }

    public int getTransferRate() { return transferRate; }
    public void setTransferRate(int transferRate) { this.transferRate = transferRate; }

    public int getLoanApplyRate() { return loanApplyRate; }
    public void setLoanApplyRate(int loanApplyRate) { this.loanApplyRate = loanApplyRate; }

    public int getCollateralRate() { return collateralRate; }
    public void setCollateralRate(int collateralRate) { this.collateralRate = collateralRate; }

    public int getRefundRate() { return refundRate; }
    public void setRefundRate(int refundRate) { this.refundRate = refundRate; }

    public int getCreditPayRate() { return creditPayRate; }
    public void setCreditPayRate(int creditPayRate) { this.creditPayRate = creditPayRate; }

    public int getLoanApproveRate() { return loanApproveRate; }
    public void setLoanApproveRate(int loanApproveRate) { this.loanApproveRate = loanApproveRate; }

    public int getLoanRejectRate() { return loanRejectRate; }
    public void setLoanRejectRate(int loanRejectRate) { this.loanRejectRate = loanRejectRate; }

    public int getRepayFullRate() { return repayFullRate; }
    public void setRepayFullRate(int repayFullRate) { this.repayFullRate = repayFullRate; }

    public int getRepayPartialRate() { return repayPartialRate; }
    public void setRepayPartialRate(int repayPartialRate) { this.repayPartialRate = repayPartialRate; }
}
