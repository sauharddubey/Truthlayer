# AI Agents Subsystem (`backend/app/agents`)

This directory contains the fleet of specialized AI analysis agents and the orchestrator engine responsible for multi-tier video intelligence analysis in TruthLayer.

## Subsystem Architecture

TruthLayer executes AI agents concurrently using Python `concurrent.futures.ThreadPoolExecutor`. Per-user OpenRouter keys are isolated per execution context using `contextvars.copy_context()`.

```
                    +--------------------------------+
                    |    orchestrator.py Controller  |
                    +--------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
  +------------------+                            +------------------+
  |  content.py      |                            | verification.py  |
  |  (Initial Topic  |                            | (Product Doc RAG |
  |   Classification)|                            |  Verification)   |
  +------------------+                            +------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |           Parallel Agent Fleet Pool           |
            |                                               |
            | - fact_check.py       - perception.py         |
            | - bias.py             - sentiment.py          |
            | - compliance.py       - creator_risk.py       |
            | - media_integrity.py  - narrative.py          |
            +-----------------------------------------------+
```

## Agent Manifest

| Module | Agent Class | Function & Description |
| :--- | :--- | :--- |
| **`base.py`** | `BaseAgent` | Abstract base class defining common execution interfaces, structured JSON prompting, fallback handling, and telemetry. |
| **`orchestrator.py`** | `Orchestrator` | Coordinates agent tier selection, parallel execution pool management, context propagation, and score aggregation. |
| **`content.py`** | `ContentAgent` | Initial classification agent that labels video segments as safe, verify, or risky, and identifies product context. |
| **`fact_check.py`** | `FactCheckAgent` | Mines claims from transcripts, retrieves web evidence via Tavily API, and evaluates claim accuracy and trust scores. |
| **`perception.py`** | `PerceptionAgent` | Analyzes public reception, potential audience offense, tone suitability, and brand sensitivity. |
| **`bias.py`** | `BiasAgent` | Detects political, ideological, or commercial bias, emotional loaded language, and framing strategies. |
| **`sentiment.py`** | `SentimentAgent` | Computes overall emotional valence, tone categories, and segment-by-segment sentiment progression over video timestamps. |
| **`compliance.py`** | `ComplianceAgent` | Evaluates claims against regulatory guidelines (FTC, FDA, GDPR) and product compliance knowledge bases. |
| **`creator_risk.py`** | `CreatorRiskAgent` | Assesses creator reputational risks, sponsorship policy violations, and brand safety concerns. |
| **`media_integrity.py`**| `MediaIntegrityAgent` | Evaluates video and audio for manipulation, synthetic media indicators, and deepfake signals. |
| **`verification.py`** | `VerificationAgent` | Performs semantic matching of extracted claims against business product documentation in `pgvector`. |
| **`narrative.py`** | `NarrativeAgent` | Clusters claims into high-level narrative themes across videos to detect emerging messaging trends. |

## Resilience & Fallback Design

Every agent in this fleet inherits from `BaseAgent` and guarantees the following operational properties:

1. **Graceful Degradation**: If an LLM call times out or fails due to quota exhaustion, the agent catches the exception, logs the error, and returns a valid JSON structure containing neutral fallback scores and confidence indicators.
2. **Standard Output Schema**: All agents return a dictionary containing structured findings, evidence lists, and an overall `confidence` score (0.0 to 1.0).
3. **Thread Safety**: Agents execute stateless functions that do not mutate global variables or thread-unsafe objects.
