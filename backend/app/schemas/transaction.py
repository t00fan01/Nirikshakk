from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


SCHEMA_VERSION = "schema_v1"


class BitcoinTransactionRecord(BaseModel):
    """
    Standard schema_v1 representation of an ingested/generated Bitcoin transaction
    enriched with correlated network metadata.
    """
    timestamp: str = Field(..., description="ISO 8601 timestamp of transaction observation (UTC)")
    src_ip: str = Field(..., description="Source IPv4 or IPv6 address broadcasting the transaction")
    dst_ip: str = Field(..., description="Destination peer IPv4 or IPv6 receiving node")
    src_port: int = Field(..., ge=1, le=65535, description="Source network port")
    dst_port: int = Field(8333, ge=1, le=65535, description="Destination network port (default 8333 for BTC P2P)")
    txid: str = Field(..., min_length=64, max_length=64, description="64-character hex Bitcoin transaction identifier")
    input_addresses: List[str] = Field(..., min_length=1, description="List of input wallet addresses")
    output_addresses: List[str] = Field(..., min_length=1, description="List of output wallet addresses")
    input_amounts: List[float] = Field(..., min_length=1, description="BTC amounts associated with each input address")
    output_amounts: List[float] = Field(..., min_length=1, description="BTC amounts received by each output address")
    fee: float = Field(..., ge=0.0, description="Mining fee in BTC")
    script_type: str = Field("P2WPKH", description="Primary Bitcoin script type (e.g. P2WPKH, P2PKH, P2SH, P2TR)")
    geo_country: str = Field(..., min_length=2, max_length=2, description="2-letter ISO country code of source node")
    ASN: str = Field(..., description="Autonomous System Number of source node (e.g. AS13335)")

    @field_validator("txid")
    @classmethod
    def validate_txid_hex(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if len(v_clean) != 64:
            raise ValueError(f"TXID must be 64 characters, got {len(v_clean)}")
        int(v_clean, 16)  # Will raise ValueError if non-hex
        return v_clean

    @model_validator(mode="after")
    def validate_inputs_and_outputs(self) -> "BitcoinTransactionRecord":
        if len(self.input_addresses) != len(self.input_amounts):
            raise ValueError(
                f"Mismatch: {len(self.input_addresses)} input addresses vs {len(self.input_amounts)} input amounts"
            )
        if len(self.output_addresses) != len(self.output_amounts):
            raise ValueError(
                f"Mismatch: {len(self.output_addresses)} output addresses vs {len(self.output_amounts)} output amounts"
            )
        
        sum_in = round(sum(self.input_amounts), 8)
        sum_out = round(sum(self.output_amounts), 8)
        expected_fee = round(sum_in - sum_out, 8)
        
        # Validate fee tolerance (within satoshi precision)
        if expected_fee < -1e-8:
            raise ValueError(
                f"Total outputs ({sum_out} BTC) exceed total inputs ({sum_in} BTC) in tx {self.txid}"
            )
        return self


class GroundTruthRecord(BaseModel):
    """
    Hidden ground-truth record for offline model evaluation.
    Never exposed in the client UI.
    """
    txid: str
    label: str = Field(..., description="'normal' or 'anomaly'")
    anomaly_type: Optional[str] = Field(
        None,
        description="Type of anomaly (e.g. rapid_multihop_cluster, peeling_chain, burst_surge, network_correlated)"
    )
    pattern_name: Optional[str] = None
    notes: Optional[str] = None
    entities_involved: List[str] = Field(default_factory=list)


class DatasetSummary(BaseModel):
    """Summary statistics for an ingested or generated dataset."""
    schema_version: str = SCHEMA_VERSION
    total_transactions: int
    unique_wallets: int
    unique_ips: int
    total_btc_volume: float
    time_range_start: str
    time_range_end: str


class DatasetUploadResponse(BaseModel):
    """
    Response payload returned upon dataset upload and schema validation.
    """
    filename: str
    detected_format: str
    total_rows: int
    valid_rows: int
    rejected_rows: int
    validation_status: str = Field(..., description="'PASSED', 'PARTIAL', or 'FAILED'")
    summary: Optional[DatasetSummary] = None
    rejected_details: List[Dict[str, Any]] = Field(default_factory=list)
