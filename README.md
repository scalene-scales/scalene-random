# Scalene Scale's Random Utilities

This package contains various utilities that Scalene Scale uses in Scalene Scale's various projects for random number generation.

The unlying PRNG algorithm is Alea, adapted from Johannes Baagøe's [archived website](https://web.archive.org/web/20120125044127/http://baagoe.org/en/wiki/Better_random_numbers_for_javascript). The algorithm was mostly chosen for speed reasons and is not cryptographically secure, so this library should not be used in use cases where security matters.

# Installing

```
npm install github:scalene-scales/scalene-binary github:scalene-scales/scalene-random
```

WARN: Because GitHub deprecated the `git://` protocol, please run the following command to use `SSH` instead for installation:

```
git config --global url."ssh://git@".insteadOf git://
```

See https://github.com/npm/cli/issues/4896#issuecomment-1127023942 for more details.

# Maintainers

If the tests values change, that represents a breaking change, so SemVer major version needs to be updated.
Fundamentally, such a change implies that, at the minimum, all tests using this library break;
and at the extreme, any production usage involved encoded PRNG states will become non-reproducable.

## TODO

Figure out why absolute imports break whne this package is installed as a dependency.
Figure out if there's a way to cleanly change imports from `@scalene-scales/scalene-binary/dist/lib/constants` to `@scalene-scales/scalene-binary/lib/constants`.
