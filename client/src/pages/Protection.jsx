import React from 'react';
import { Link } from 'react-router-dom';

export default function Protection() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer &amp; Seller Protection</h1>
          <p className="text-gray-600 mb-8">How TicketTrade keeps both sides of every trade safe.</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your money is held in escrow</h2>
            <p className="text-gray-700 leading-relaxed">
              When you buy a ticket, your payment doesn't go straight to the seller. We hold it
              securely in escrow while the seller transfers the ticket to you through Ticketmaster.
              The seller only gets paid once you've received your ticket and confirmed it's correct.
              That means a seller can't take your money and disappear &mdash; the funds never reach
              them until you have your ticket in hand.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Confirm only when you actually have the ticket</h2>
            <p className="text-gray-700 leading-relaxed">
              After the seller sends the transfer, you'll see a <span className="font-medium">"I Received the Ticket"</span> button.
              Press it only once the ticket is actually in your Ticketmaster account and you've
              confirmed it's the right one. Because every transfer runs through Ticketmaster, an
              invalid or fake ticket can't complete the transfer in the first place &mdash; so if
              something isn't right, don't confirm, and your escrowed payment is refunded to you.
              Once you confirm receipt, the sale is final and payment is released to the seller.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">If an event is canceled</h2>
            <p className="text-gray-700 leading-relaxed">
              If a show is canceled and not rescheduled, Ticketmaster refunds the ticket's face
              value directly to whoever holds the ticket at that point &mdash; which, after transfer,
              is you. You don't need to do anything through us for that refund; it comes from
              Ticketmaster.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Because TicketTrade caps prices at face value, you're never exposed to the markup
              losses common on other resale platforms. The only amount not covered is the
              TicketTrade platform fee and payment processing fee, which are non-refundable because
              the transaction itself completed successfully.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">If an event is rescheduled</h2>
            <p className="text-gray-700 leading-relaxed">
              If a show is postponed or rescheduled and your ticket remains valid for the new date,
              the sale stands and no refund applies &mdash; the ticket you hold is still good for the
              event. This is the same approach used across the ticketing industry.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Only trades made on TicketTrade are protected</h2>
            <p className="text-gray-700 leading-relaxed">
              This protection applies only to purchases completed through TicketTrade, with payment
              held in our escrow. Deals arranged or paid for off the platform &mdash; over text,
              social media, or a peer-to-peer payment app &mdash; carry none of these protections,
              and we can't help if something goes wrong. Keep every step on TicketTrade so you stay
              covered.
            </p>
          </section>

          <div className="border-t pt-6 text-sm text-gray-500">
            <p>
              This page explains how TicketTrade's protections work in plain language. It isn't a
              legal contract and doesn't replace our full Terms of Use. Questions? <Link to="/" className="text-blue-600 hover:underline">Head back home</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
