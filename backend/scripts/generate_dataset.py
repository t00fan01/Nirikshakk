#!/usr/bin/env python3
"""
NIRIKSHAK AI — Synthetic Bitcoin Transaction & Network Dataset Generator (SIH26146)

Phase 1 Implementation:
Generates synthetic Bitcoin transaction metadata correlated with network-layer
signals (IP, port, timing, ASN, country) based on schema_v1.

Produces:
1. data/demo_transactions.csv
2. data/demo_transactions.json
3. data/ground_truth.json (hidden labels for offline evaluation)
"""

import argparse
import csv
import hashlib
import json
import math
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

SCHEMA_VERSION = "schema_v1"

# Realistic autonomous systems & geographic mapping
NETWORK_PROFILES = [
    {"asn": "AS13335", "name": "Cloudflare", "country": "US", "risk_weight": 0.05},
    {"asn": "AS16509", "name": "Amazon AWS", "country": "US", "risk_weight": 0.08},
    {"asn": "AS24940", "name": "Hetzner Online", "country": "DE", "risk_weight": 0.12},
    {"asn": "AS15169", "name": "Google LLC", "country": "US", "risk_weight": 0.04},
    {"asn": "AS3209", "name": "Vodafone GmbH", "country": "DE", "risk_weight": 0.02},
    {"asn": "AS3320", "name": "Deutsche Telekom", "country": "DE", "risk_weight": 0.02},
    {"asn": "AS12876", "name": "ONLINE S.A.S.", "country": "FR", "risk_weight": 0.10},
    {"asn": "AS4637", "name": "Telstra Global", "country": "AU", "risk_weight": 0.03},
    {"asn": "AS4766", "name": "Korea Telecom", "country": "KR", "risk_weight": 0.03},
    {"asn": "AS2516", "name": "KDDI Corporation", "country": "JP", "risk_weight": 0.02},
    {"asn": "AS2856", "name": "British Telecom", "country": "GB", "risk_weight": 0.02},
    {"asn": "AS9009", "name": "M247 Ltd (Bulletproof/VPN)", "country": "NL", "risk_weight": 0.85},
    {"asn": "AS204957", "name": "Green Floid Tor Exit Node", "country": "NL", "risk_weight": 0.95},
    {"asn": "AS44050", "name": "Petersburg Internet Network", "country": "RU", "risk_weight": 0.70},
    {"asn": "AS51167", "name": "Contabo GmbH", "country": "DE", "risk_weight": 0.25},
    {"asn": "AS55836", "name": "Reliance Jio", "country": "IN", "risk_weight": 0.03},
    {"asn": "AS45609", "name": "Bharti Airtel", "country": "IN", "risk_weight": 0.03},
]

SCRIPT_TYPES = ["P2WPKH", "P2PKH", "P2SH", "P2TR"]
SCRIPT_WEIGHTS = [0.55, 0.25, 0.15, 0.05]


def generate_btc_address(rng: random.Random, script_type: str, seed_prefix: str = "") -> str:
    """Generate a realistic synthetic Bitcoin address matching script type."""
    h = hashlib.sha256(f"{seed_prefix}_{rng.random()}".encode()).hexdigest()
    if script_type == "P2WPKH":
        # Native SegWit (Bech32)
        return "bc1q" + h[:26] + h[30:38]
    elif script_type == "P2TR":
        # Taproot (Bech32m)
        return "bc1p" + h[:32] + h[34:40]
    elif script_type == "P2SH":
        # SegWit compatible / Multisig
        return "3" + h[:33]
    else:
        # Legacy P2PKH
        return "1" + h[:33]


def generate_txid(rng: random.Random, data_seed: str) -> str:
    """Generate deterministic 64-hex transaction ID."""
    return hashlib.sha256(f"NIRIKSHAK_TX_{data_seed}_{rng.random()}".encode()).hexdigest()


def generate_ip_address(rng: random.Random, asn_info: Dict[str, Any]) -> str:
    """Generate realistic IP address correlated with network profile."""
    # Specific subnet prefixes for realism
    if "Bulletproof" in asn_info["name"]:
        return f"185.{rng.randint(100, 240)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"
    if "Tor" in asn_info["name"]:
        return f"194.26.{rng.randint(10, 80)}.{rng.randint(1, 254)}"
    if "Amazon" in asn_info["name"]:
        return f"34.{rng.randint(192, 255)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"
    if "Cloudflare" in asn_info["name"]:
        return f"104.{rng.randint(16, 31)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"
    if "Hetzner" in asn_info["name"]:
        return f"88.{rng.randint(99, 198)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"
    # Generic public IPv4
    return f"{rng.randint(45, 215)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"


class SyntheticBitcoinGenerator:
    def __init__(
        self,
        num_tx: int = 5000,
        num_wallets: int = 1200,
        num_ips: int = 400,
        anomaly_pct: float = 5.0,
        days: int = 7,
        start_time: datetime = None,
        seed: int = 42,
    ):
        self.num_tx = num_tx
        self.num_wallets = num_wallets
        self.num_ips = num_ips
        self.anomaly_pct = anomaly_pct
        self.days = days
        self.rng = random.Random(seed)
        
        self.start_time = start_time or (
            datetime.now(timezone.utc) - timedelta(days=self.days)
        )
        self.end_time = self.start_time + timedelta(days=self.days)

        # Pre-generate persistent pool of wallets
        self.wallets: List[Dict[str, Any]] = []
        self._init_wallet_pool()

        # Pre-generate persistent pool of IP nodes
        self.ip_nodes: List[Dict[str, Any]] = []
        self._init_network_pool()

    def _init_wallet_pool(self):
        """Create pool of wallets with realistic script types and activity profiles."""
        for i in range(self.num_wallets):
            script_type = self.rng.choices(SCRIPT_TYPES, weights=SCRIPT_WEIGHTS)[0]
            addr = generate_btc_address(self.rng, script_type, seed_prefix=f"wallet_{i}")
            # Activity tier: merchant (high freq), standard user, low freq cold storage
            tier = self.rng.choices(["high", "medium", "low"], weights=[0.05, 0.45, 0.50])[0]
            self.wallets.append({
                "address": addr,
                "script_type": script_type,
                "tier": tier,
                "balance": round(self.rng.uniform(0.01, 25.0), 8)
            })

    def _init_network_pool(self):
        """Create pool of realistic network observer nodes."""
        normal_profiles = [p for p in NETWORK_PROFILES if p["risk_weight"] < 0.2]
        for i in range(self.num_ips):
            profile = self.rng.choice(normal_profiles)
            ip = generate_ip_address(self.rng, profile)
            self.ip_nodes.append({
                "ip": ip,
                "asn": profile["asn"],
                "country": profile["country"],
                "name": profile["name"],
            })

    def _random_timestamp(self) -> datetime:
        """Sample timestamp with natural daily diurnal variation."""
        offset_seconds = self.rng.uniform(0, self.days * 86400)
        dt = self.start_time + timedelta(seconds=offset_seconds)
        # Diurnal weight: slightly more active between 10:00 and 22:00 UTC
        hour = dt.hour
        diurnal_factor = 1.0 + 0.3 * math.sin((hour - 8) * math.pi / 12)
        if self.rng.random() > (diurnal_factor / 1.3):
            # re-sample slightly
            dt += timedelta(hours=self.rng.choice([-2, 2, 4]))
        return dt

    def generate(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Generate complete dataset: transactions and ground truth.
        """
        transactions: List[Dict[str, Any]] = []
        ground_truth: Dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "config": {
                "num_tx": self.num_tx,
                "num_wallets": self.num_wallets,
                "num_ips": self.num_ips,
                "anomaly_pct": self.anomaly_pct,
                "time_range_days": self.days,
            },
            "summary": {},
            "transactions": {},
            "wallets": {},
        }

        # Calculate target anomaly count
        target_anomalies = max(15, int(self.num_tx * (self.anomaly_pct / 100.0)))

        scenario_generators = [
            (self._generate_rapid_multihop_cluster, "multihop"),
            (self._generate_peeling_chain, "peeling"),
            (self._generate_burst_fanout, "burst"),
            (self._generate_network_correlated_anomaly, "tor_net"),
            (self._generate_fanin_consolidation, "fanin"),
        ]
        scenario_counts = {name: 0 for _, name in scenario_generators}

        # Cycle through scenarios until target_anomalies is fulfilled
        while len(transactions) < target_anomalies:
            for gen_fn, name in scenario_generators:
                if len(transactions) >= target_anomalies:
                    break
                s_txs, s_gt = gen_fn(scenario_counts[name])
                scenario_counts[name] += 1
                transactions.extend(s_txs)
                ground_truth["transactions"].update(s_gt["transactions"])
                ground_truth["wallets"].update(s_gt["wallets"])

        current_anomaly_count = len(transactions)

        # 6. Fill remaining transactions as Normal Traffic
        remaining_count = max(0, self.num_tx - current_anomaly_count)
        normal_txs, normal_gt = self._generate_normal_traffic(remaining_count)
        transactions.extend(normal_txs)
        ground_truth["transactions"].update(normal_gt["transactions"])

        # Sort all transactions chronologically by timestamp
        transactions.sort(key=lambda x: x["timestamp"])

        # Compile final summary statistics for ground truth
        anomaly_breakdown = {}
        for item in ground_truth["transactions"].values():
            atype = item.get("anomaly_type") or "normal"
            anomaly_breakdown[atype] = anomaly_breakdown.get(atype, 0) + 1

        ground_truth["summary"] = {
            "total_transactions": len(transactions),
            "normal_count": anomaly_breakdown.get("normal", 0),
            "anomaly_count": len(transactions) - anomaly_breakdown.get("normal", 0),
            "anomaly_percentage": round(
                ((len(transactions) - anomaly_breakdown.get("normal", 0)) / len(transactions)) * 100, 2
            ),
            "anomaly_breakdown": anomaly_breakdown,
        }

        return transactions, ground_truth

    def _generate_rapid_multihop_cluster(self, cluster_idx: int = 0) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Scripted Scenario 1:
        Wallet A -> Wallet B -> Wallet C -> Wallet D -> Wallet E
        Rapid multi-hop transfers (15-45 sec delay), identical high-value structuring (minus fee).
        Broadcasted through correlated European VPN / Bulletproof nodes.
        """
        txs = []
        gt_txs = {}
        gt_wallets = {}

        cluster_id = f"cluster_rapid_multihop_{cluster_idx}"
        hops = [
            generate_btc_address(self.rng, "P2WPKH", f"nirikshak_origin_a_{cluster_id}"),
            generate_btc_address(self.rng, "P2WPKH", f"nirikshak_hop1_b_{cluster_id}"),
            generate_btc_address(self.rng, "P2WPKH", f"nirikshak_hop2_c_{cluster_id}"),
            generate_btc_address(self.rng, "P2WPKH", f"nirikshak_hop3_d_{cluster_id}"),
            generate_btc_address(self.rng, "P2WPKH", f"nirikshak_exit_e_{cluster_id}"),
        ]

        roles = ["originator", "hop_1", "hop_2", "hop_3", "terminal_exit"]
        for addr, role in zip(hops, roles):
            gt_wallets[addr] = {
                "label": "suspicious",
                "cluster_id": cluster_id,
                "role": role,
            }

        start_dt = self.start_time + timedelta(
            days=self.rng.uniform(0.5 + cluster_idx * 0.8, 1.5 + cluster_idx * 0.8) % self.days,
            hours=self.rng.uniform(2, 8)
        )
        current_amount = round(self.rng.uniform(14.5, 18.0), 8)
        current_time = start_dt

        # Suspicious network context
        bulletproof_profile = next(p for p in NETWORK_PROFILES if p["asn"] == "AS9009")
        src_ip = generate_ip_address(self.rng, bulletproof_profile)

        for i in range(len(hops) - 1):
            src_addr = hops[i]
            dst_addr = hops[i + 1]
            fee = round(self.rng.uniform(0.00015, 0.00025), 8)
            out_amount = round(current_amount - fee, 8)
            txid = generate_txid(self.rng, f"multihop_{cluster_idx}_{i}")

            current_time = current_time + timedelta(seconds=self.rng.randint(20, 55))

            tx = {
                "timestamp": current_time.isoformat(),
                "src_ip": src_ip,
                "dst_ip": f"198.51.100.{self.rng.randint(10, 200)}",
                "src_port": self.rng.randint(32000, 61000),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": [src_addr],
                "output_addresses": [dst_addr],
                "input_amounts": [current_amount],
                "output_amounts": [out_amount],
                "fee": fee,
                "script_type": "P2WPKH",
                "geo_country": bulletproof_profile["country"],
                "ASN": bulletproof_profile["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "anomaly",
                "anomaly_type": "rapid_multihop_cluster",
                "pattern_name": "Rapid Multi-Hop Laundering Layer",
                "notes": f"Step {i+1} of 4: Rapid fund forwarding ({current_amount} BTC -> {out_amount} BTC) across fresh addresses in < 60s",
                "entities_involved": [src_addr, dst_addr, src_ip, bulletproof_profile["asn"]],
            }

            current_amount = out_amount

        return txs, {"transactions": gt_txs, "wallets": gt_wallets}

    def _generate_peeling_chain(self, chain_idx: int = 0) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Scripted Scenario 2:
        High-value origin peels off small payment amounts (e.g. 1.25 BTC)
        while forwarding remaining balance to newly generated change addresses across 8 hops.
        """
        txs = []
        gt_txs = {}
        gt_wallets = {}

        chain_id = f"peeling_chain_{chain_idx}"
        start_dt = self.start_time + timedelta(
            days=self.rng.uniform(1.0 + chain_idx * 0.9, 2.0 + chain_idx * 0.9) % self.days
        )
        current_time = start_dt

        initial_balance = round(self.rng.uniform(35.0, 48.0), 8)
        current_input_amount = initial_balance

        current_input_wallet = generate_btc_address(self.rng, "P2WPKH", f"peel_origin_{chain_id}")
        gt_wallets[current_input_wallet] = {
            "label": "suspicious",
            "cluster_id": chain_id,
            "role": "peeling_origin",
        }

        # Moderate noise network profile
        net_profile = next(p for p in NETWORK_PROFILES if p["asn"] == "AS24940")

        num_peels = 8
        for hop in range(num_peels):
            peeled_amount = round(self.rng.uniform(1.10, 1.45), 8)
            fee = round(self.rng.uniform(0.00018, 0.00028), 8)
            change_amount = round(current_input_amount - peeled_amount - fee, 8)

            peel_dest_wallet = generate_btc_address(self.rng, "P2WPKH", f"peel_out_{chain_id}_{hop}")
            next_change_wallet = generate_btc_address(self.rng, "P2WPKH", f"peel_change_{chain_id}_{hop}")

            gt_wallets[peel_dest_wallet] = {
                "label": "suspicious",
                "cluster_id": chain_id,
                "role": "peeled_destination",
            }
            gt_wallets[next_change_wallet] = {
                "label": "suspicious",
                "cluster_id": chain_id,
                "role": "peeling_change",
            }

            txid = generate_txid(self.rng, f"peel_tx_{chain_idx}_{hop}")
            current_time = current_time + timedelta(seconds=self.rng.randint(120, 360))

            tx = {
                "timestamp": current_time.isoformat(),
                "src_ip": generate_ip_address(self.rng, net_profile),
                "dst_ip": f"198.51.100.{self.rng.randint(10, 200)}",
                "src_port": self.rng.randint(20000, 60000),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": [current_input_wallet],
                "output_addresses": [peel_dest_wallet, next_change_wallet],
                "input_amounts": [current_input_amount],
                "output_amounts": [peeled_amount, change_amount],
                "fee": fee,
                "script_type": "P2WPKH",
                "geo_country": net_profile["country"],
                "ASN": net_profile["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "anomaly",
                "anomaly_type": "peeling_chain",
                "pattern_name": "Structured Peeling Chain",
                "notes": f"Peel hop {hop+1}/{num_peels}: Extracted {peeled_amount} BTC, forwarded change {change_amount} BTC",
                "entities_involved": [current_input_wallet, peel_dest_wallet, next_change_wallet],
            }

            current_input_wallet = next_change_wallet
            current_input_amount = change_amount

        return txs, {"transactions": gt_txs, "wallets": gt_wallets}

    def _generate_burst_fanout(self, burst_idx: int = 0) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Scripted Scenario 3:
        Single wallet executes 14 rapid transactions in under 2 minutes,
        fanning out structured equal amounts to 14 distinct wallets from a single IP.
        """
        txs = []
        gt_txs = {}
        gt_wallets = {}

        source_wallet = generate_btc_address(self.rng, "P2WPKH", f"burst_source_wallet_{burst_idx}")
        cluster_id = f"cluster_burst_fanout_{burst_idx}"
        gt_wallets[source_wallet] = {
            "label": "suspicious",
            "cluster_id": cluster_id,
            "role": "fanout_originator",
        }

        burst_start = self.start_time + timedelta(
            days=self.rng.uniform(0.8 + burst_idx * 1.1, 1.8 + burst_idx * 1.1) % self.days
        )
        net_profile = next(p for p in NETWORK_PROFILES if p["asn"] == "AS16509")
        fixed_src_ip = generate_ip_address(self.rng, net_profile)

        num_burst_txs = 14
        for i in range(num_burst_txs):
            dest_wallet = generate_btc_address(self.rng, "P2WPKH", f"burst_dest_{burst_idx}_{i}")
            gt_wallets[dest_wallet] = {
                "label": "suspicious",
                "cluster_id": cluster_id,
                "role": "fanout_recipient",
            }

            # Amounts structured just below 1 BTC
            out_amount = 0.95000000
            fee = 0.00012000
            in_amount = round(out_amount + fee, 8)
            tx_time = burst_start + timedelta(seconds=i * 6 + self.rng.randint(1, 4))
            txid = generate_txid(self.rng, f"burst_tx_{burst_idx}_{i}")

            tx = {
                "timestamp": tx_time.isoformat(),
                "src_ip": fixed_src_ip,
                "dst_ip": f"198.51.100.{self.rng.randint(10, 200)}",
                "src_port": self.rng.randint(30000, 65000),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": [source_wallet],
                "output_addresses": [dest_wallet],
                "input_amounts": [in_amount],
                "output_amounts": [out_amount],
                "fee": fee,
                "script_type": "P2WPKH",
                "geo_country": net_profile["country"],
                "ASN": net_profile["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "anomaly",
                "anomaly_type": "burst_surge",
                "pattern_name": "High-Velocity Fan-Out Structuring",
                "notes": f"Burst transaction {i+1}/14 emitted from {fixed_src_ip} within 90-second window",
                "entities_involved": [source_wallet, dest_wallet, fixed_src_ip],
            }

        return txs, {"transactions": gt_txs, "wallets": gt_wallets}

    def _generate_network_correlated_anomaly(self, net_idx: int = 0) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Scripted Scenario 4:
        Multiple distinct wallets broadcast through the exact same Tor exit node ASN
        and high-risk bulletproof IP in tight succession.
        """
        txs = []
        gt_txs = {}
        gt_wallets = {}

        cluster_id = f"cluster_tor_coordinated_{net_idx}"
        tor_profile = next(p for p in NETWORK_PROFILES if p["asn"] == "AS204957")
        tor_ip = generate_ip_address(self.rng, tor_profile)
        base_time = self.start_time + timedelta(
            days=self.rng.uniform(1.2 + net_idx * 0.9, 2.2 + net_idx * 0.9) % self.days
        )

        num_events = 10
        for i in range(num_events):
            src_addr = generate_btc_address(self.rng, "P2SH", f"tor_src_{net_idx}_{i}")
            dst_addr = generate_btc_address(self.rng, "P2SH", f"tor_dst_{net_idx}_{i}")

            gt_wallets[src_addr] = {
                "label": "suspicious",
                "cluster_id": cluster_id,
                "role": "tor_coordinated_sender",
            }

            in_amount = round(self.rng.uniform(3.0, 7.5), 8)
            fee = round(self.rng.uniform(0.0002, 0.0004), 8)
            out_amount = round(in_amount - fee, 8)
            tx_time = base_time + timedelta(seconds=i * 25 + self.rng.randint(2, 10))
            txid = generate_txid(self.rng, f"tor_tx_{net_idx}_{i}")

            tx = {
                "timestamp": tx_time.isoformat(),
                "src_ip": tor_ip,
                "dst_ip": f"198.51.100.{self.rng.randint(10, 200)}",
                "src_port": self.rng.randint(15000, 60000),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": [src_addr],
                "output_addresses": [dst_addr],
                "input_amounts": [in_amount],
                "output_amounts": [out_amount],
                "fee": fee,
                "script_type": "P2SH",
                "geo_country": tor_profile["country"],
                "ASN": tor_profile["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "anomaly",
                "anomaly_type": "network_correlated",
                "pattern_name": "Shared Infrastructure Coordinated Broadcast",
                "notes": f"Transaction from wallet {src_addr[:10]}... routed via high-risk Tor Exit ASN ({tor_profile['asn']})",
                "entities_involved": [src_addr, dst_addr, tor_ip, tor_profile["asn"]],
            }

        return txs, {"transactions": gt_txs, "wallets": gt_wallets}

    def _generate_fanin_consolidation(self, fanin_idx: int = 0) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Scripted Scenario 5:
        Multiple distinct feeder addresses rapidly fund a single aggregator wallet.
        """
        txs = []
        gt_txs = {}
        gt_wallets = {}

        cluster_id = f"cluster_fanin_consolidation_{fanin_idx}"
        aggregator_wallet = generate_btc_address(self.rng, "P2TR", f"aggregator_target_{fanin_idx}")
        gt_wallets[aggregator_wallet] = {
            "label": "suspicious",
            "cluster_id": cluster_id,
            "role": "consolidation_aggregator",
        }

        base_time = self.start_time + timedelta(
            days=self.rng.uniform(1.5 + fanin_idx * 1.0, 2.5 + fanin_idx * 1.0) % self.days
        )
        net_profile = next(p for p in NETWORK_PROFILES if p["asn"] == "AS51167")

        num_feeders = 8
        for i in range(num_feeders):
            feeder = generate_btc_address(self.rng, "P2TR", f"feeder_{fanin_idx}_{i}")
            gt_wallets[feeder] = {
                "label": "suspicious",
                "cluster_id": cluster_id,
                "role": "consolidation_feeder",
            }

            in_amount = round(self.rng.uniform(2.1, 2.5), 8)
            fee = 0.00015000
            out_amount = round(in_amount - fee, 8)
            tx_time = base_time + timedelta(seconds=i * 18 + self.rng.randint(1, 5))
            txid = generate_txid(self.rng, f"fanin_tx_{fanin_idx}_{i}")

            tx = {
                "timestamp": tx_time.isoformat(),
                "src_ip": generate_ip_address(self.rng, net_profile),
                "dst_ip": f"198.51.100.{self.rng.randint(10, 200)}",
                "src_port": self.rng.randint(25000, 62000),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": [feeder],
                "output_addresses": [aggregator_wallet],
                "input_amounts": [in_amount],
                "output_amounts": [out_amount],
                "fee": fee,
                "script_type": "P2TR",
                "geo_country": net_profile["country"],
                "ASN": net_profile["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "anomaly",
                "anomaly_type": "fan_in_consolidation",
                "pattern_name": "Rapid Multi-Source Fund Aggregation",
                "notes": f"Feeder {i+1}/8 consolidated {out_amount} BTC into central aggregator {aggregator_wallet[:12]}...",
                "entities_involved": [feeder, aggregator_wallet],
            }

        return txs, {"transactions": gt_txs, "wallets": gt_wallets}

    def _generate_normal_traffic(self, count: int) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Generate standard background Bitcoin transaction traffic.
        Includes 1-in-2-out (payment + change), 2-in-1-out, and 1-in-1-out transactions.
        """
        txs = []
        gt_txs = {}

        for i in range(count):
            tx_type = self.rng.choices(["1_in_2_out", "1_in_1_out", "2_in_1_out", "1_in_3_out"], weights=[0.65, 0.15, 0.15, 0.05])[0]

            # Choose source wallet based on activity tier
            src_wallet_obj = self.rng.choice(self.wallets)
            src_wallet = src_wallet_obj["address"]
            script_type = src_wallet_obj["script_type"]

            # Network observer node
            observer = self.rng.choice(self.ip_nodes)

            # Amount distribution (pareto/log-normal: mostly 0.005 to 2.5 BTC, rare up to 10 BTC)
            base_amt = self.rng.lognormvariate(mu=-1.2, sigma=1.1)
            base_amt = max(0.001, min(25.0, base_amt))

            tx_time = self._random_timestamp()
            txid = generate_txid(self.rng, f"normal_{i}")

            fee = round(self.rng.uniform(0.00005, 0.00025), 8)

            if tx_type == "1_in_2_out":
                dst_wallet = self.rng.choice(self.wallets)["address"]
                change_wallet = generate_btc_address(self.rng, script_type, f"change_{i}")

                payment_split = self.rng.uniform(0.2, 0.7)
                pay_amt = round((base_amt - fee) * payment_split, 8)
                change_amt = round((base_amt - fee) - pay_amt, 8)

                in_addrs = [src_wallet]
                in_amts = [round(base_amt, 8)]
                out_addrs = [dst_wallet, change_wallet]
                out_amts = [pay_amt, change_amt]

            elif tx_type == "2_in_1_out":
                src_wallet_2 = self.rng.choice(self.wallets)["address"]
                dst_wallet = self.rng.choice(self.wallets)["address"]

                part1 = round(base_amt * 0.6, 8)
                part2 = round(base_amt * 0.4, 8)
                total_in = round(part1 + part2, 8)
                out_amt = round(total_in - fee, 8)

                in_addrs = [src_wallet, src_wallet_2]
                in_amts = [part1, part2]
                out_addrs = [dst_wallet]
                out_amts = [out_amt]

            elif tx_type == "1_in_3_out":
                dst_1 = self.rng.choice(self.wallets)["address"]
                dst_2 = self.rng.choice(self.wallets)["address"]
                change_wallet = generate_btc_address(self.rng, script_type, f"change3_{i}")

                p1 = round((base_amt - fee) * 0.3, 8)
                p2 = round((base_amt - fee) * 0.3, 8)
                p3 = round((base_amt - fee) - p1 - p2, 8)

                in_addrs = [src_wallet]
                in_amts = [round(base_amt, 8)]
                out_addrs = [dst_1, dst_2, change_wallet]
                out_amts = [p1, p2, p3]

            else:  # 1_in_1_out
                dst_wallet = self.rng.choice(self.wallets)["address"]
                out_amt = round(base_amt - fee, 8)
                in_addrs = [src_wallet]
                in_amts = [round(base_amt, 8)]
                out_addrs = [dst_wallet]
                out_amts = [out_amt]

            tx = {
                "timestamp": tx_time.isoformat(),
                "src_ip": observer["ip"],
                "dst_ip": f"198.51.100.{self.rng.randint(1, 254)}",
                "src_port": self.rng.randint(10240, 65535),
                "dst_port": 8333,
                "txid": txid,
                "input_addresses": in_addrs,
                "output_addresses": out_addrs,
                "input_amounts": in_amts,
                "output_amounts": out_amts,
                "fee": fee,
                "script_type": script_type,
                "geo_country": observer["country"],
                "ASN": observer["asn"],
            }
            txs.append(tx)

            gt_txs[txid] = {
                "label": "normal",
                "anomaly_type": None,
                "pattern_name": "Standard Peer Transaction",
                "notes": "Standard transaction distribution matching historical baseline",
                "entities_involved": in_addrs + out_addrs,
            }

        return txs, {"transactions": gt_txs}


def export_dataset(transactions: List[Dict[str, Any]], ground_truth: Dict[str, Any], output_dir: Path):
    """Write transactions to CSV and JSON, and ground truth to JSON."""
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = output_dir / "demo_transactions.csv"
    json_path = output_dir / "demo_transactions.json"
    gt_path = output_dir / "ground_truth.json"

    # 1. Export CSV (JSON-encode list columns for standard CSV portability)
    fieldnames = [
        "timestamp", "src_ip", "dst_ip", "src_port", "dst_port", "txid",
        "input_addresses", "output_addresses", "input_amounts", "output_amounts",
        "fee", "script_type", "geo_country", "ASN"
    ]
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for tx in transactions:
            row = tx.copy()
            row["input_addresses"] = json.dumps(row["input_addresses"])
            row["output_addresses"] = json.dumps(row["output_addresses"])
            row["input_amounts"] = json.dumps(row["input_amounts"])
            row["output_amounts"] = json.dumps(row["output_amounts"])
            writer.writerow(row)

    # 2. Export JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"schema_version": SCHEMA_VERSION, "transactions": transactions}, f, indent=2)

    # 3. Export Ground Truth
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    return csv_path, json_path, gt_path


def main():
    parser = argparse.ArgumentParser(
        description="NIRIKSHAK AI — Synthetic Bitcoin Transaction Traffic Dataset Generator (SIH26146)"
    )
    parser.add_argument("--num-tx", type=int, default=5000, help="Total number of transactions to generate (default: 5000)")
    parser.add_argument("--num-wallets", type=int, default=1200, help="Size of wallet pool (default: 1200)")
    parser.add_argument("--num-ips", type=int, default=350, help="Size of observer IP node pool (default: 350)")
    parser.add_argument("--anomaly-pct", type=float, default=5.0, help="Percentage of transactions in anomalous patterns (default: 5.0)")
    parser.add_argument("--days", type=int, default=7, help="Time range span in days (default: 7)")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save generated datasets")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible demo generation (default: 42)")

    args = parser.parse_args()

    # Determine default output path relative to script location or backend/data
    if args.output_dir:
        out_dir = Path(args.output_dir)
    else:
        # Resolve to backend/data
        script_dir = Path(__file__).resolve().parent
        out_dir = script_dir.parent / "data"

    print("=" * 70)
    print("NIRIKSHAK AI — Synthetic Bitcoin Dataset Generator (SIH26146 Phase 1)")
    print("=" * 70)
    print(f"Target Transactions : {args.num_tx}")
    print(f"Wallet Pool Size    : {args.num_wallets}")
    print(f"IP Pool Size        : {args.num_ips}")
    print(f"Target Anomaly Pct  : {args.anomaly_pct}%")
    print(f"Time Range (Days)   : {args.days}")
    print(f"Random Seed         : {args.seed}")
    print(f"Output Directory    : {out_dir.resolve()}")
    print("-" * 70)

    generator = SyntheticBitcoinGenerator(
        num_tx=args.num_tx,
        num_wallets=args.num_wallets,
        num_ips=args.num_ips,
        anomaly_pct=args.anomaly_pct,
        days=args.days,
        seed=args.seed,
    )

    print("Generating transactions and synthetic anomaly topologies...")
    transactions, ground_truth = generator.generate()

    print("Writing files...")
    csv_path, json_path, gt_path = export_dataset(transactions, ground_truth, out_dir)

    summary = ground_truth["summary"]
    print("\nDataset Generation Complete!")
    print(f"  • Total Transactions : {summary['total_transactions']}")
    print(f"  • Normal Count       : {summary['normal_count']}")
    print(f"  • Anomaly Count      : {summary['anomaly_count']} ({summary['anomaly_percentage']}%)")
    print("  • Anomaly Breakdown  :")
    for k, v in summary["anomaly_breakdown"].items():
        if k != "normal":
            print(f"      - {k.replace('_', ' ').title()}: {v} txs")
    print(f"\nGenerated Files:")
    print(f"  [CSV]          : {csv_path.resolve()} ({csv_path.stat().st_size / 1024:.1f} KB)")
    print(f"  [JSON]         : {json_path.resolve()} ({json_path.stat().st_size / 1024:.1f} KB)")
    print(f"  [Ground Truth] : {gt_path.resolve()} ({gt_path.stat().st_size / 1024:.1f} KB)")
    print("=" * 70)


if __name__ == "__main__":
    main()
