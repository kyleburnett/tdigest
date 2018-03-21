# tdigest

This library is based on [welch/tdigest](https://github.com/welch/tdigest) and [vadimg/js_bintrees](https://github.com/vadimg/js_bintrees). It adds methods for serialization and deserialization for space-efficient JSON storage. For documentation covering standard usage, please consult the [welch/tdigest](https://github.com/welch/tdigest) readme and examples. For information on how to use the serialization and deserialization methods, please read on.

# Serialization/Deserialization

To compactly represent a Javascript data structure like a TDigest instance, it is important to consider the storage costs of a JSON stringified object versus a JSON stringified array.

If you wanted to store a student's name and their full time status, for instance, and you didn't care about stringified JSON storage costs, the best way to represent that student is:

```
{
    "name": "Sheri Hodges",
    "full_time": false
}
```

Without unnecessary whitespace, this comes out to 41 characters. If we do care about storage of the serialized representation, a better representation would be

```
[
    "Sheri Hodges", false
]
```

This comes out to 21 characters. We can make further improvements to serialization/deserialization by serializing all `false` values to 0 and all `true` values to 1 (as long as the deserialization process knows whether something should be interpreted as a real number or a boolean). So then we have

```
[
    "Sheri Hodges", 0
]
```

This results in 18 characters.

## `.serialize()`

```
var tdigest = new TDigest();
// Make changes to tdigest
var compact = JSON.stringify(tdigest.serialize());
// Store contents of `compact` for later use
```

## `.deserialize(obj)`

```
var obj = JSON.parse(compact); // See above for how `compact` was created
var tdigest = new TDigest();
tdigest.deserialize(obj);
```

# Browser

You can find builds for the browser on the [releases page](https://github.com/kyleburnett/tdigest/releases). Look for artifacts like tdigest-X.X.X.min.js where `X.X.X` is the version name.
