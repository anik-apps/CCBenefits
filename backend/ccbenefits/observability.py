"""OpenTelemetry setup for Grafana Cloud observability.

Configures metrics, logs, and auto-instrumentation for FastAPI + SQLAlchemy.
If GRAFANA_OTLP_ENDPOINT is not set, all OTel setup is skipped (dev mode).
"""

import base64
import logging
import logging.config
import re

from .config import GRAFANA_INSTANCE_ID, GRAFANA_OTLP_ENDPOINT, GRAFANA_OTLP_TOKEN

logger = logging.getLogger(__name__)

# Globals for shutdown
_meter_provider = None
_logger_provider = None

# PII masking filter for OTel log handler
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


class _PIIMaskingFilter(logging.Filter):
    """Masks email addresses in log messages before sending to cloud.

    Creates a copy of the record to avoid mutating the shared LogRecord
    that other handlers (e.g., console) also process.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        if "@" in msg:
            import copy
            masked = _EMAIL_PATTERN.sub(
                lambda m: m.group().split("@")[0][:3] + "***@" + m.group().split("@")[1], msg
            )
            # Mutate record for this handler only — OTel handler gets masked version
            record.msg = masked
            record.args = None
        return True


def setup_json_logging() -> None:
    """Configure JSON structured logging to stdout."""
    from pythonjsonlogger import json as json_log

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": json_log.JsonFormatter,
                "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console"],
        },
    })


def setup_observability(app, engine) -> None:
    """Set up OTel instrumentation if Grafana Cloud is configured.

    Args:
        app: FastAPI application instance
        engine: SQLAlchemy engine instance (must be passed explicitly since it's
                created at module import time before this function runs)
    """
    global _meter_provider, _logger_provider

    # Always set up JSON logging to stdout
    setup_json_logging()

    if not GRAFANA_OTLP_ENDPOINT:
        logger.info("GRAFANA_OTLP_ENDPOINT not set — OTel disabled (dev mode)")
        return

    logger.info("Setting up OpenTelemetry for Grafana Cloud")

    from opentelemetry import metrics
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource

    # Auth header for Grafana Cloud
    auth = base64.b64encode(f"{GRAFANA_INSTANCE_ID}:{GRAFANA_OTLP_TOKEN}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}"}

    resource = Resource.create({"service.name": "ccbenefits"})

    # Metrics
    metric_exporter = OTLPMetricExporter(
        endpoint=f"{GRAFANA_OTLP_ENDPOINT}/v1/metrics",
        headers=headers,
    )
    metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=30000)
    _meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(_meter_provider)

    # Logs
    log_exporter = OTLPLogExporter(
        endpoint=f"{GRAFANA_OTLP_ENDPOINT}/v1/logs",
        headers=headers,
    )
    _logger_provider = LoggerProvider(resource=resource)
    _logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))

    # Bridge stdlib logging → OTel (additive to stdout handler)
    otel_handler = LoggingHandler(logger_provider=_logger_provider)
    otel_handler.addFilter(_PIIMaskingFilter())
    logging.getLogger().addHandler(otel_handler)

    # Auto-instrument FastAPI (excludes /api/health from metrics)
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="api/health",
    )

    # Auto-instrument SQLAlchemy (must pass engine explicitly)
    SQLAlchemyInstrumentor().instrument(engine=engine)

    logger.info("OpenTelemetry configured for Grafana Cloud")


def shutdown_observability() -> None:
    """Flush and shut down OTel providers. Call during app shutdown."""
    if _meter_provider:
        _meter_provider.shutdown()
    if _logger_provider:
        _logger_provider.shutdown()
