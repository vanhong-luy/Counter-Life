# Testing Guide — Loans, Credit Cards & Savings Goals

## Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | jacob.green4@seed.local | password |
| Admin | admin@equinox.local | admin |

---

## Test 1: Loan Repayment with Interest Split

**Precondition:** You have an active loan with an outstanding balance.

1. Login as **jacob.green4@seed.local** / `password`
2. Go to `/dashboard/loans`
3. Click **"Make a Payment"** or **"Pay Now"** on any active loan
4. In the modal:
   - See the **Min Payment / Full Balance / Custom** quick-amount buttons
   - See the **interest breakdown** box showing how the payment splits
   - Verify: `Monthly interest on $X = $Y` matches `balance × (APR ÷ 12)`
5. Enter an amount and submit
6. After payment, verify the success message shows: `"$X paid — $Y interest + $Z principal"`
7. Click **"History"** on the loan card
8. Verify the history table now shows **INTEREST** and **PRINCIPAL** columns with the real split values

---

## Test 2: Late Fees on Loans (Requires Time Skip)

**Precondition:** You have an active loan with `nextPaymentDueDate` in the past.

**Step A — Set up an overdue loan (via admin):**
1. Login to admin at `/admin/login` as `admin@equinox.local` / `admin`
2. Navigate to a loan that's active but overdue
   - OR: Use **Time Skip** to advance time past a loan's due date
3. Go to `/admin/settings`
4. In the **Loan Products** section, verify you can see and edit the **Late Fee ($)** column
5. Change a late fee (e.g., Personal from $35 to $50) and save

**Step B — Trigger late fee assessment:**
> **Note:** `LoanService.assessLateFees()` is a programmatic method — it runs on the scheduled cron or can be called via time skip. There is no admin UI button for it yet.

The late fee is assessed automatically when:
- A loan's `nextPaymentDueDate < today`
- AND `lastLateFeeCharged` is null or earlier than today

To test, use **Time Skip** (admin settings panel, click **"+1 MONTH"**):
- This triggers interest accrual, maintenance fees, AND late fee assessment
- After time skip, check the customer's loan — a `late_fee` transaction should appear
- Verify the outstanding balance increased by the late fee amount

---

## Test 3: Configure Late Fees Via Admin

1. Go to `/admin/settings`
2. Find the **Loan Products Base Interest Rates** card
3. Click **Edit** on any loan type
4. Change the **Late Fee ($)** value
5. Click **Save**
6. Hit **Time Skip** to apply late fees to overdue loans with the new rate

---

## Notes

- **No time skip? No late fees.** `assessLateFees()` only runs during time skip or the scheduled cron (1st of month at 4 AM). Normal repayments do not trigger it.
- **Interest is calculated per-payment now** — each repayment uses `accruedInterest = balance × (APR ÷ 12)` and pays interest first, then principal.
- **History split is real-time** — once a repayment is made with the new code, the INTEREST/PRINCIPAL columns show accurate data. Old repayments (before this change) will show $0 interest / full amount as principal.

---

# Credit Cards

## Credentials (Credit Card Tests)

Same as above. If your user does not have a credit card, request one at `/dashboard/cards/request` (select **Credit** and submit).

---

## Test 4: Credit Card Purchase & Spending Limits

**Precondition:** You have a credit card with available credit.

1. Login as **jacob.green4@seed.local** / `password`
2. Go to `/dashboard/cards`
3. Click on a credit card (shows "Visa Credit" or "Mastercard Credit")
4. Verify the **Credit Details** panel shows:
   - **Credit Limit** (e.g., $5,000)
   - **Outstanding Balance** (may be $0 or higher)
   - **Available Credit** (= limit − balance)
   - **APR** (e.g., 22.99%)
5. Note the current **Available Credit** value
6. Click **"Simulate Purchase"** → `/dashboard/cards/simulate?id={id}`
7. Enter **Merchant**: `TestStore`, **Amount**: `100`, click **Charge**
8. Verify success: **"Charged to credit line"** and available credit decreased by $100
9. Click **"Return to Card"** to go back to details
10. Toggle **Freeze Card** to ON
11. Click **"Simulate Purchase"** again, enter any amount, click **Charge**
12. Verify decline: **"Card is frozen"**
13. Go back, toggle **Freeze Card** to OFF
14. Click **"Manage Limits"**
15. Set **Daily Limit** to `50`, click **Save**
16. Go to **Simulate Purchase**, enter **Amount**: `60`, click **Charge**
17. Verify decline: **"Daily spending limit exceeded"**
18. Go back to **Manage Limits**, reset **Daily Limit** to `1000`, click **Save**

---

## Test 5: Credit Card Payment

**Precondition:** You have a credit card with outstanding balance > $0. If not, make a small purchase first (see Test 4).

1. On the card details page, click **"Make a Credit Payment"**
2. In the modal:
   - Select a checking account from the dropdown
   - Enter an amount (e.g., `50`)
3. Click **Submit**
4. Verify success message
5. Verify **Outstanding Balance** decreased by $50
6. Verify **Available Credit** increased by $50
7. Go to the **Statements** section — verify the latest open statement now shows **Paid**

---

## Test 6: Statement Generation & Interest (Requires Time Skip)

**Precondition:** You have a credit card with outstanding balance > $0 (e.g., after Test 4 or Test 5 reversal).

1. On card details, note the current **Outstanding Balance** and **APR** from the credit panel
2. Open a second browser/incognito window, login as admin at `/admin/login` as `admin@equinox.local` / `admin`
3. Go to `/admin/settings`
4. Click **"+1 MONTH"** in the Time Skip panel
5. Wait for the time skip to complete, then switch back to the user window
6. Refresh the card details page
7. In the **Statements** section, verify a new statement appears
8. Verify the statement fields:
   - **Due Date** = statement date + 21 days
   - **Starting Balance** ≈ the balance you noted before time skip
   - **Interest Charge** is listed as a transaction with merchant `"Interest Charge"`
   - Interest amount matches: `balance × (APR ÷ 365) × 30`
     > Example: $1,000 balance × (0.2299 ÷ 365) × 30 = $18.90
   - **Ending Balance** = Starting Balance + Interest
   - **Minimum Payment** = 2% of Ending Balance (or full balance if 2% < $25)
     > Example: $1,018.90 × 0.02 = $20.38 → since $20.38 < $25, min payment = full $1,018.90
9. Expand the statement to see itemized transactions for that period

---

## Test 7: Late Fee Assessment (Requires Time Skip + Admin Setup)

**Step A — Configure a late fee on the card type:**
1. Login as admin at `/admin/login` as `admin@equinox.local` / `admin`
2. Go to `/admin/settings`
3. Scroll to the **Card Types** table (below Loan Products)
4. Click **Edit** on a credit row (e.g., **Visa — credit** or **Mastercard — credit**)
5. Set **Late Fee ($)** to `35.00`
6. Click **Save**
7. Verify the confirmation message and that the table now shows `$35.00`

**Step B — Trigger late fee assessment:**
1. Ensure your user has an unpaid statement past its due date (from Test 6)
2. In the admin settings page, click **"+1 MONTH"** (Time Skip) again
3. Wait for completion
4. Switch to the user window, refresh card details
5. In the transaction list, verify a **Late Fee** transaction for `$35.00` appears
6. Verify **Outstanding Balance** increased by $35.00
7. In the **Statements** section, verify the same statement's ending balance also increased

**Step C — Clean up (optional):**
1. As admin, go back to `/admin/settings`
2. Edit the credit card type and reset **Late Fee ($)** back to `0.00`
3. Click **Save**

---

## Credit Card Feature Summary

| Feature | Where to Test | Real-World Match |
|---------|--------------|-----------------|
| Available credit check | Test 4 — purchase declines when limit exceeded | ✅ Credit limit − outstanding balance |
| Daily spending limit | Test 4 — set limit to $50, try $60 purchase | ✅ Enforced per-card daily cap |
| Monthly spending limit | Test 4 — purchase declines if month-to-date + amount > monthly limit | ✅ Enforced per-card monthly cap |
| Card freeze toggle | Test 4 — all purchases blocked when frozen | ✅ Immediate freeze, no auth allowed |
| Credit card payment | Test 5 — pay from checking, balance reduces | ✅ Payment posts instantly to balance |
| Statement generation | Test 6 — created after time skip | ✅ 21-day grace period on due date |
| APR interest charge | Test 6 — `balance × (APR ÷ 365) × 30` | ✅ Exact daily periodic rate formula |
| Minimum payment | Test 6 — 2% of balance (or full if 2% < $25) | ⚠️ See note below |
| Late fee assessment | Test 7 — past-due statement triggers fee | ✅ Configurable flat fee per card type |

> **Note on minimum payment:** Unlike most real-world cards which use `max($25, 2% of balance)`, this system sets minimum payment to the **full balance** when 2% is under $25. For example, a $1,000 balance has a 2% min pay of $20, which is < $25, so the full $1,000 is due. Only balances ≥ $1,250 get the standard 2% minimum.

---

# Savings Goals

## Credentials (Savings Goal Tests)

Same credentials. Ensure you have a checking account with a positive balance before starting.

---

## Test 8: Create Goal & Deposit

**Precondition:** You have a checking account with at least $500 balance.

1. Login as **jacob.green4@seed.local** / `password`
2. Go to `/dashboard/savings`
3. Verify the summary cards at the top: **Total Earmarked Saved**, **Total Goals Target**, **Active Vaults**
4. Click **"Create New Goal"**
5. In the modal:
   - **Goal Name**: `"Test Vacation Fund"`
   - **Category**: `Travel & Vacation`
   - **Target Amount**: `500`
   - **Target Completion Date**: pick a future date (3 months out)
   - **Source Account**: select your checking account
   - Leave **Auto-release** unchecked
   - Click **Save**
6. Verify the new goal card appears with:
   - Status badge: **ACTIVE** (blue)
   - Progress bar at 0%
   - **Current Amount**: `$0.00` of `$500.00`
7. Click **"+ Add Funds"** on the goal card
8. In the modal, enter **Amount**: `200`, click **Deposit**
9. Verify success
10. Verify the goal card now shows:
    - **Current Amount**: `$200.00`
    - Progress bar at 40%
11. Go to `/dashboard/accounts` and check your checking account balance
12. Verify the balance decreased by $200 (the deposited amount is ring-fenced)
13. Go to `/dashboard/transactions`, search for `"Test Vacation Fund"`
14. Verify a **savings_goal_deposit** transaction for `$200` appears

---

## Test 9: Auto-Release on Completion

**Precondition:** You have a checking account with sufficient balance.

1. Go to `/dashboard/savings`
2. Click **"Create New Goal"**
3. In the modal:
   - **Goal Name**: `"Auto-Release Test"`
   - **Category**: `Emergency`
   - **Target Amount**: `100`
   - **Target Date**: any future date
   - **Source Account**: your checking account
   - Check **Auto-release** ON
   - Click **Save**
4. Note your current checking account balance
5. Click **"+ Add Funds"**, deposit `$60`, verify goal shows $60 / $100
6. Click **"+ Add Funds"** again, deposit `$40` (pushes it to exactly $100)
7. Verify:
   - Goal card now shows **COMPLETED** (green badge)
   - **Current Amount**: `$0.00` (auto-released)
   - A celebration banner appears (e.g., "Goal Completed!")
   - **"Withdraw All"** button is visible instead of "+ Add Funds"
8. Go to your checking account — verify the balance is back to approximately the original amount
   > The `$100` was deducted in two deposits, then the full `$100` was auto-released back, so net change = $0
9. Check `/dashboard/transactions` for two `savings_goal_deposit` entries and one `savings_goal_withdrawal` entry with description `"Auto-release from completed goal: Auto-Release Test"`

---

## Test 10: Partial Withdrawal & Cancel Refund

**Precondition:** You have an active goal with a positive balance (e.g., "Test Vacation Fund" from Test 8 with $200).

**Step A — Partial withdrawal:**
1. Go to `/dashboard/savings`
2. On the **"Test Vacation Fund"** goal, click **"Release"**
3. Enter **Amount**: `50`, click **Release**
4. Verify success
5. Verify goal now shows **Current Amount**: `$150.00`
6. Check your checking account — verify the balance increased by $50
7. Check `/dashboard/transactions` — verify a `savings_goal_withdrawal` entry for $50

**Step B — Cancel goal & full refund:**
1. On the same goal, click **"Cancel"** (red button)
2. Confirm the dialog: **"Are you sure? All saved funds will return to your primary account."**
3. Verify the goal card now shows:
   - Status badge: **CANCELLED** (red)
   - **Current Amount**: `$0.00`
4. Check your checking account — verify the remaining `$150` was refunded
5. Check `/dashboard/transactions` — verify a `savings_goal_withdrawal` transaction with description `"Refund from cancelled goal: Test Vacation Fund"`

---

## Savings Goal Feature Summary

| Feature | Where to Test | How It Works |
|---------|--------------|-------------|
| Ring-fenced balance | Test 8 — deposit reduces account balance, goal tracks separately | ✅ Money deducted from account, credited to `currentAmount` |
| Progress tracking | Test 8 — goal card shows amount, target, percentage bar | ✅ Real-time progress bar + numeric display |
| Auto-release on completion | Test 9 — hitting target auto-refunds full amount | ✅ Status flips to COMPLETED, money returned, logs audit trail |
| Manual partial withdrawal | Test 10 — release some funds back to account | ✅ Withdraw any amount ≤ currentAmount from ACTIVE/COMPLETED goals |
| Cancel & full refund | Test 10 — cancel returns 100% of saved funds | ✅ Full refund before status changes to CANCELLED |
| Audit trail | Tests 8–10 — `savings_goal_deposit` / `savings_goal_withdrawal` transactions | ✅ Every action logged with reference number and description |
| Cache eviction | Tests 8–10 — account balances update across dashboard instantly | ✅ `@CacheEvict("customer_accounts")` + analytics invalidation |
