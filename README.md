# Scalene Scale's Random Utilities

This package contains various utilities that Scalene Scale uses in Scalene Scale's various projects for random number generation.

The unlying PRNG algorithm is Alea, adapted from Johannes Baagøe's archived website. The algorithm was mostly chosen for speed reasons and is not cryptographically secure, so this library should not be used in use cases where security matters.

NOTE: If the tests values change, that represents a breaking change, so major version needs to be updated.
