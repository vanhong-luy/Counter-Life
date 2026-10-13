package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public class TransactionVolumeResponse {
    private BigDecimal depositsSum;
    private BigDecimal withdrawalsSum;
    private BigDecimal transfersSum;
    private List<VolumeBucket> buckets;

    public BigDecimal getDepositsSum() { return depositsSum; }
    public void setDepositsSum(BigDecimal depositsSum) { this.depositsSum = depositsSum; }
    public BigDecimal getWithdrawalsSum() { return withdrawalsSum; }
    public void setWithdrawalsSum(BigDecimal withdrawalsSum) { this.withdrawalsSum = withdrawalsSum; }
    public BigDecimal getTransfersSum() { return transfersSum; }
    public void setTransfersSum(BigDecimal transfersSum) { this.transfersSum = transfersSum; }
    public List<VolumeBucket> getBuckets() { return buckets; }
    public void setBuckets(List<VolumeBucket> buckets) { this.buckets = buckets; }

    public static class VolumeBucket {
        private String label;
        private BigDecimal deposit;
        private BigDecimal transfer;

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public BigDecimal getDeposit() { return deposit; }
        public void setDeposit(BigDecimal deposit) { this.deposit = deposit; }
        public BigDecimal getTransfer() { return transfer; }
        public void setTransfer(BigDecimal transfer) { this.transfer = transfer; }
    }
}
