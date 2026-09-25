"""
NIRIKSHAK AI — Unsupervised Behavioral Clustering Test Suite (Phase 9 Step 2)

Tests:
1. Feature selection: 22 independent features, excluding redundant dimensions.
2. Preprocessing pipeline: log1p, bounded ratio, zero NaN, zero Inf.
3. K diagnostics and K=6 deterministic clustering.
4. PCA coordinate projection.
5. Cluster profiles and evidence-safe naming.
6. Nearest-neighbor similarity engine with self-exclusion.
7. End-to-end artifact persistence and zero ground-truth leakage.
"""

from pathlib import Path
import sys
import unittest
import numpy as np
import polars as pl

# Ensure backend directory is in path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.clustering import (
    CLUSTER_FEATURE_NAMES,
    EXCLUDED_FEATURE_NAMES,
    find_similar_wallets,
    get_wallet_cluster,
    load_cluster_assignments,
    load_cluster_profiles,
    prepare_clustering_matrix,
    run_behavioral_clustering,
)
from app.ml.features import NUMERICAL_FEATURE_NAMES


class TestBehavioralClustering(unittest.TestCase):
    """Unit and regression tests for Phase 9 behavioral clustering engine."""

    @classmethod
    def setUpClass(cls):
        cls.features_path = Path(__file__).resolve().parent.parent / "data" / "analysis" / "wallet_features.parquet"
        if not cls.features_path.exists():
            raise unittest.SkipTest("wallet_features.parquet not available")
        cls.df_features = pl.read_parquet(cls.features_path)

    def test_feature_selection_excludes_redundancies(self):
        """Verify feature selection retains exactly 22 independent features."""
        self.assertEqual(len(NUMERICAL_FEATURE_NAMES), 24)
        self.assertIn("wallet_degree", EXCLUDED_FEATURE_NAMES)
        self.assertIn("amount_fragmentation_score", EXCLUDED_FEATURE_NAMES)
        self.assertEqual(len(CLUSTER_FEATURE_NAMES), 22)
        self.assertNotIn("wallet_degree", CLUSTER_FEATURE_NAMES)
        self.assertNotIn("amount_fragmentation_score", CLUSTER_FEATURE_NAMES)

    def test_preprocessing_finite_and_bounded(self):
        """Verify preprocessing eliminates NaN/Inf and applies bounded transforms."""
        addresses, X_trans, cols = prepare_clustering_matrix(self.df_features)
        self.assertEqual(len(addresses), len(self.df_features))
        self.assertEqual(X_trans.shape, (len(self.df_features), 22))
        self.assertFalse(np.isnan(X_trans).any(), "Preprocessing produced NaN values")
        self.assertFalse(np.isinf(X_trans).any(), "Preprocessing produced Inf values")

        # Burstiness column index
        burst_idx = cols.index("burstiness")
        burst_vals = X_trans[:, burst_idx]
        self.assertTrue((burst_vals >= -1.0).all() and (burst_vals <= 1.0).all())

        # Ratio column index
        ratio_idx = cols.index("input_output_ratio")
        ratio_vals = X_trans[:, ratio_idx]
        self.assertTrue((ratio_vals >= -3.0).all() and (ratio_vals <= 3.0).all())

    def test_clustering_execution_and_assignment_integrity(self):
        """Verify K=6 clustering partitions all wallets with finite spatial metrics."""
        df_clusters = load_cluster_assignments()
        self.assertEqual(len(df_clusters), len(self.df_features))
        self.assertEqual(df_clusters["wallet_address"].n_unique(), len(self.df_features))

        cluster_ids = sorted(df_clusters["cluster_id"].unique().to_list())
        self.assertEqual(cluster_ids, [0, 1, 2, 3, 4, 5])

        # Verify finite PCA and centroid distance coordinates
        pca_x = df_clusters["pca_x"].to_numpy()
        pca_y = df_clusters["pca_y"].to_numpy()
        dists = df_clusters["distance_to_centroid"].to_numpy()

        self.assertTrue(np.isfinite(pca_x).all())
        self.assertTrue(np.isfinite(pca_y).all())
        self.assertTrue(np.isfinite(dists).all())
        self.assertTrue((dists >= 0.0).all())

    def test_cluster_profiles_and_evidence_safe_labels(self):
        """Verify cluster profiles contain non-empty, evidence-safe labels and traits."""
        profiles = load_cluster_profiles()
        self.assertEqual(profiles.total_clusters, 6)
        self.assertEqual(profiles.total_wallets, len(self.df_features))
        self.assertGreater(profiles.diagnostics.selected_k_silhouette, 0.2)

        total_wallet_count = sum(p.wallet_count for p in profiles.clusters)
        self.assertEqual(total_wallet_count, len(self.df_features))

        prohibited_terms = ["criminal", "hacker", "darknet", "malicious", "syndicate", "guaranteed"]

        for p in profiles.clusters:
            self.assertGreater(p.wallet_count, 0)
            self.assertTrue(len(p.label) > 0)
            self.assertTrue(len(p.description) > 0)
            self.assertGreaterEqual(len(p.top_differentiating_features), 1)

            # Evidence-safe language check
            for term in prohibited_terms:
                self.assertNotIn(term, p.label.lower())
                self.assertNotIn(term, p.description.lower())

    def test_deterministic_reproducibility(self):
        """Verify clustering is 100% bit-for-bit deterministic with random_state=42."""
        prof1, df1 = run_behavioral_clustering(self.df_features, random_state=42)
        prof2, df2 = run_behavioral_clustering(self.df_features, random_state=42)

        self.assertTrue((df1["cluster_id"] == df2["cluster_id"]).all())
        self.assertTrue((df1["distance_to_centroid"] == df2["distance_to_centroid"]).all())
        self.assertTrue((df1["pca_x"] == df2["pca_x"]).all())
        self.assertTrue((df1["pca_y"] == df2["pca_y"]).all())

    def test_similarity_engine_excludes_self(self):
        """Verify behavioral similarity engine strictly excludes target wallet and is deterministic."""
        target = self.df_features["wallet_address"][10]
        res1 = find_similar_wallets(target, top_n=5)

        self.assertEqual(res1.target_wallet, target)
        self.assertEqual(res1.returned_count, 5)

        returned_addrs = [w.wallet_address for w in res1.similar_wallets]
        self.assertNotIn(target, returned_addrs, "Target wallet found in its own similar neighbors!")

        for sw in res1.similar_wallets:
            self.assertGreaterEqual(sw.similarity_score, -1.0)
            self.assertLessEqual(sw.similarity_score, 1.0)
            self.assertGreaterEqual(sw.similarity_percent, 0.0)
            self.assertLessEqual(sw.similarity_percent, 100.0)

        # Deterministic check
        res2 = find_similar_wallets(target, top_n=5)
        self.assertEqual(
            [w.wallet_address for w in res1.similar_wallets],
            [w.wallet_address for w in res2.similar_wallets],
        )

    def test_single_wallet_cluster_lookup(self):
        """Verify single wallet cluster lookup works accurately."""
        target = self.df_features["wallet_address"][50]
        assignment = get_wallet_cluster(target)
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.wallet_address, target)
        self.assertIn(assignment.cluster_id, [0, 1, 2, 3, 4, 5])
        self.assertTrue(np.isfinite(assignment.distance_to_centroid))


if __name__ == "__main__":
    unittest.main()
