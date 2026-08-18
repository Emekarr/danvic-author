'use client'

import { Badge } from '@danvic/ui'
import type { AuthorPaymentTransaction } from '@danvic/api-client'

const formatNaira = (amountKobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amountKobo / 100)

export function PaymentsPage({ transactions }: { transactions: AuthorPaymentTransaction[] }) {
  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <h1>Course transaction log</h1>
      </header>
      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>All transactions</h2>
            <p>
              {transactions.length} total · Paystack payments for courses owned by this author
              account.
            </p>
          </div>
        </div>
        {transactions.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Date / reference</th>
                  <th>Course / learner</th>
                  <th>Amount / fees</th>
                  <th>Adapter / method</th>
                  <th>Instrument</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <strong>{new Date(transaction.createdAt).toLocaleString()}</strong>
                      <span className="sb-cell-secondary">{transaction.reference}</span>
                    </td>
                    <td>
                      <strong>{transaction.courseId ?? '—'}</strong>
                      <span className="sb-cell-secondary">{transaction.customerEmail}</span>
                    </td>
                    <td>
                      <strong>{formatNaira(transaction.amountKobo)}</strong>
                      <span className="sb-cell-secondary">
                        Fees:{' '}
                        {transaction.feesKobo === null ? '—' : formatNaira(transaction.feesKobo)}
                      </span>
                    </td>
                    <td>
                      <strong>{transaction.adapter}</strong>
                      <span className="sb-cell-secondary">
                        {transaction.paymentMethod ?? 'Pending selection'}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {transaction.cardBrand ??
                          transaction.cardType ??
                          transaction.bankName ??
                          '—'}
                      </strong>
                      <span className="sb-cell-secondary">
                        {transaction.cardLast4
                          ? `Ending ${transaction.cardLast4}`
                          : transaction.accountName}
                      </span>
                    </td>
                    <td>
                      <Badge tone={transaction.status === 'succeeded' ? 'green' : 'violet'} dot>
                        {transaction.status}
                      </Badge>
                      {transaction.gatewayResponse ? (
                        <span className="sb-cell-secondary">{transaction.gatewayResponse}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-empty-line">No course transactions have been recorded.</p>
        )}
      </section>
    </div>
  )
}