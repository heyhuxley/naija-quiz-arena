# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Nigerian guests join live quiz sessions without accounts. Approved hosts sign in, select questions, and guide sessions. A project administrator approves hosts and manages reports.

## Product Purpose

Who Wants To Be A Literature Giant is a free trivia platform for Nigerian players. Hosts run 15 question sessions using a shared question bank and a simulated NGN prize ladder. The ladder has no cash payout. Success means guests can join easily, answer privately, and complete a fair session with a reliable personal result.

## Positioning

An approved host chooses and orders questions, then advances a whole group through a shared game while each guest answers privately on their own device.

## Operating Context

Sessions support both groups playing in the same room and hosts and guests joining remotely. The host and each guest use their own device. Hosts choose a 15, 30, or 60 second timer per question. Each session has at most ten guests.

## Capabilities and Constraints

Hosts sign in with email and password and require administrator approval. Guests join with a short code and display name, without an account. A shared question bank covers English, Economics, Literature, and Government. Sessions use 15 ordered questions, three one use lifelines, a fixed simulated NGN prize ladder, private answers, and private results. Supabase is the managed backend for data, identity, storage, and trusted game actions. React Router runs on Cloudflare Workers.

## Evidence on Hand

The project scope and accepted host session spec define the product rules. No user research, testimonials, customer claims, or cash prizes are established.

## Product Principles

- Joining as a guest should be quick.
- Hosts guide a shared pace while guest answers stay private.
- Server saved state determines accepted actions and scores.
- Question edits must not change a session already in progress or its results.
- Simulated prize values must never imply a cash payout.

## Accessibility & Inclusion

The product scope requires keyboard use, screen reader support, readable contrast, zoom, reduced motion, and mobile friendly play.
