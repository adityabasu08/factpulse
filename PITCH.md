# FactPulse - Problem Statement

## The Problem
Misinformation about food safety spreads rapidly on social media, causing unnecessary panic and health risks. Users struggle to verify claims like "Brand X cereal is contaminated" without navigating complex government databases.

## Our Solution
FactPulse is an AI-powered fact-checker that translates natural language rumors into structured queries against the official FDA enforcement database, delivering a clear verdict with confidence scoring in seconds.

## Key Features
- **Entity Extraction**: Extracts brand and product type from messy social media text using Google Gemini.
- **FDA Integration**: Queries the official openFDA database for active recalls.
- **Confidence Scoring**: Provides a deterministic confidence percentage (0-100%) using Mohar's 3-module NLP pipeline to eliminate vague "92%" answers.
- **Clear Explanations**: Translates raw FDA data into empathetic, easy-to-understand summaries.

## Target Users
Concerned consumers, social media users, and public health advocates.

## Impact
Reduces the spread of food-safety panic by providing verified, official-source truth at the point of curiosity.