var TDigest = require('../index.js');

var _ = require('lodash');

var chai = require('chai');
var expect = chai.expect

describe('T-Digests in which each point becomes a centroid', function() {
    it('consumes a point', function() {
        var tdigest = new TDigest();
        tdigest.push(0);
        var points = tdigest.toArray();
        expect(points).to.deep.equal([{
            mean: 0,
            n: 1
        }]);
    });

    it('consumes two points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1]);
        var points = tdigest.toArray();
        expect(points).to.deep.equal([{
            mean: 0,
            n: 1
        }, {
            mean: 1,
            n: 1
        }]);
    });

    it('consumes three points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1, -1]);
        var points = tdigest.toArray();
        expect(points).to.deep.equal([{
            mean: -1,
            n: 1
        }, {
            mean: 0,
            n: 1
        }, {
            mean: 1,
            n: 1
        }]);
    });

    it('consumes increasing-valued points', function() {
        var tdigest = new TDigest(0.001, 0); // force a new centroid for each pt
        var i, N = 100;
        for (i = 0; i < N; i += 1) {
            tdigest.push(i * 10);
        }
        var points = tdigest.toArray();
        for (i = 0; i < N; i += 1) {
            expect(points[i].mean).to.equal(i * 10);
        }
    });

    it('consumes decreasing-valued points', function() {
        var tdigest = new TDigest(0.001, 0); // force a new centroid for each pt
        var i, N = 100;
        for (i = N - 1; i >= 0; i = i - 1) {
            tdigest.push(i * 10);
        }
        var points = tdigest.toArray();
        for (i = 0; i < N; i += 1) {
            expect(points[i].mean).to.equal(i * 10);
        }
    });
});

describe('T-Digests in which points are merged into centroids', function() {
    it('consumes same-valued points into a single point', function() {
        var tdigest = new TDigest();
        var i, N = 100;
        for (i = 0; i < N; i = i + 1) {
            tdigest.push(1000);
        }
        var points = tdigest.toArray();
        expect(points).to.deep.equal([{
            mean: 1000,
            n: N
        }]);
    });

    it('handles multiple duplicates', function() {
        var tdigest = new TDigest(1, 0, 0);
        var i, N = 10;
        for (i = 0; i < N; i++) {
            tdigest.push(0.0);
            tdigest.push(1.0);
            tdigest.push(0.5);
        }
        expect(tdigest.toArray(), [{
            mean: 0.0,
            n: N
        }, {
            mean: 0.5,
            n: N
        }, {
            mean: 1.0,
            n: N
        }]);
    });
});

describe('compress', function() {
    it('compresses points and preserves bounds', function() {
        var tdigest = new TDigest(0.001, 0);
        var i, N = 100;
        for (i = 0; i < N; i += 1) {
            tdigest.push(i * 10);
        }
        expect(tdigest.size()).to.equal(100);
        tdigest.delta = 0.1; // encourage merging (don't do this!)
        tdigest.compress();
        var points = tdigest.toArray();
        expect(points.length).to.be.lt(100);
        expect(points[0].mean).to.equal(0);
        expect(points[points.length - 1].mean).to.equal((N - 1) * 10);
    });

    it('K automatically compresses during ingest', function() {
        var tdigest = new TDigest();
        var i, N = 10000;
        for (i = 0; i < N; i += 1) {
            tdigest.push(i * 10);
        }
        var points = tdigest.toArray();
        expect(tdigest.nreset).to.be.gt(1);
        expect(points.length).to.be.lt(10000);
        expect(points[0].mean).to.equal(0);
        expect(points[points.length - 1].mean).to.equal(99990);
    });
});

describe('percentile ranks', function() {
    //
    // TDigests are really meant for large datasets and continuous
    // distributions.  On small or categorical sets, results can seem
    // strange because mass exists at boundary points. The small tests
    // here verify some precise behaviors that may not be relevant at
    // scale.
    //
    it('reports undefined when given no points', function() {
        var tdigest = new TDigest();
        var x = [1, 2, 3];
        expect(tdigest.p_rank(1)).to.be.undefined;
        expect(tdigest.p_rank(x)).to.deep.equal([undefined, undefined, undefined]);
    });

    it('from a single point', function() {
        var tdigest = new TDigest();
        tdigest.push(0);
        var x = [-0.5, 0, 0.5, 1.0, 1.5];
        var q = [0, 0.5, 1, 1, 1];
        expect(tdigest.p_rank(x)).to.deep.equal(q);
    });

    it('from two points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1]);
        var x = [-0.5, 0, 0.5, 1.0, 1.5];
        var q = [0, 0.25, 0.5, 0.75, 1];
        expect(tdigest.p_rank(x)).to.deep.equal(q);
    });

    it('from three points', function() {
        var tdigest = new TDigest();
        tdigest.push([-1, 0, 1]);
        var x = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];
        var q = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
        expect(tdigest.p_rank(x)).to.deep.equal(q);
    });

    it('from three points is same as from multiples of those points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1, -1]);
        var x = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];
        var result1 = tdigest.p_rank(x);
        tdigest.push([0, 1, -1]);
        tdigest.push([0, 1, -1]);
        var result2 = tdigest.p_rank(x);
        expect(result1).to.deep.equal(result2);
    });

    it('from four points away from the origin', function() {
        var tdigest = new TDigest();
        tdigest.push([10, 11, 12, 13]);
        var x = [9, 10, 11, 12, 13, 14];
        var q = [0, 1 / 8, 3 / 8, 5 / 8, 7 / 8, 1];
        expect(tdigest.p_rank(x)).to.deep.equal(q);
    });

    it('from four points is same as from multiples of those points', function() {
        var tdigest = new TDigest(0, 0);
        tdigest.push([10, 11, 12, 13]);
        var x = [9, 10, 11, 12, 13, 14];
        var result1 = tdigest.p_rank(x);
        tdigest.push([10, 11, 12, 13]);
        tdigest.push([10, 11, 12, 13]);
        var result2 = tdigest.p_rank(x);
        expect(result1).to.deep.equal(result2);
    });

    it('from lots of uniformly distributed points', function() {
        var tdigest = new TDigest();
        var i, x = [],
            N = 100000;
        var maxerr = 0;
        for (i = 0; i < N; i += 1) {
            x.push(Math.random());
        }
        tdigest.push(x);
        tdigest.compress();
        for (i = 0.01; i <= 1; i += 0.01) {
            var q = tdigest.p_rank(i);
            maxerr = Math.max(maxerr, Math.abs(i - q));
        }
        expect(maxerr).to.be.lt(0.01);
    });

    it('from an exact match', function() {
        var tdigest = new TDigest(0.001, 0); // no compression
        var i, N = 10;
        var maxerr = 0;
        for (i = 0; i < N; i += 1) {
            tdigest.push([10, 20, 30]);
        }
        expect(tdigest.p_rank(20)).to.equal(0.5);
    });
});

describe('percentiles', function() {
    it('reports undefined when given no points', function() {
        var tdigest = new TDigest();
        var p = [0, 0.5, 1.0];
        expect(tdigest.percentile(0.5)).to.be.undefined;
        expect(tdigest.percentile(p)).to.deep.equal([undefined, undefined, undefined]);
    });

    it('from a single point', function() {
        var tdigest = new TDigest();
        tdigest.push(0);
        var p = [0, 0.5, 1.0];
        var x = [0, 0, 0];
        expect(tdigest.percentile(p)).to.deep.equal(x);
    });

    it('from two points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1]);
        var p = [-1 / 4, 0, 1 / 4, 1 / 2, 5 / 8, 3 / 4, 1, 1.25];
        var x = [0, 0, 0, 0.5, 0.75, 1, 1, 1];
        expect(tdigest.percentile(p)).to.deep.equal(x);
    });

    it('from three points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 0.5, 1]);
        var p = [0, 1 / 4, 1 / 2, 3 / 4, 1];
        var x = [0, 0.125, 0.5, 0.875, 1.0];
        expect(tdigest.percentile(p)).to.deep.equal(x);
    });

    it('from four points', function() {
        var tdigest = new TDigest();
        tdigest.push([10, 11, 12, 13]);
        var p = [0, 1 / 4, 1 / 2, 3 / 4, 1];
        var x = [10.0, 10.5, 11.5, 12.5, 13.0];
        expect(tdigest.percentile(p)).to.deep.equal(x);
    });

    it('from lots of uniformly distributed points', function() {
        var tdigest = new TDigest();
        var i, x = [],
            N = 100000;
        var maxerr = 0;
        for (i = 0; i < N; i += 1) {
            x.push(Math.random());
        }
        tdigest.push(x);
        tdigest.compress();
        for (i = 0.01; i <= 1; i += 0.01) {
            var q = tdigest.percentile(i);
            maxerr = Math.max(maxerr, Math.abs(i - q));
        }
        expect(maxerr).to.be.lt(0.01);
    });
});

describe('serialize', function() {
    arr = [false, 0.01, 25, 1.1, 1];

    it('should report null when given no points', function() {
        var tdigest = new TDigest();
        var expected = _.cloneDeep(arr);
        expected.push(0);
        expected.push(0);
        expected.push([0, 0]);
        expect(tdigest.serialize()).to.deep.equal(expected);
    });

    it('from a single point', function() {
        var tdigest = new TDigest();
        tdigest.push(0);
        var expected = _.cloneDeep(arr);
        expected.push(1);
        expected.push(1);
        expected.push([1, [
            [0, 1, 1, 0.5], 0, 0, 0
        ]]);
        expect(tdigest.serialize()).to.deep.equal(expected);
    });

    it('from two points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1]);
        var expected = _.cloneDeep(arr);
        expected.push(2);
        expected.push(2);
        expected.push([2, [
            [0, 1, 1, 0.5], 0, [
                [1, 1, 2, 1.5], 0, 0, 1
            ], 0
        ]]);
        expect(tdigest.serialize()).to.deep.equal(expected);
    });

    it('from three points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 0.5, 1]);
        var expected = _.cloneDeep(arr);
        expected.push(3);
        expected.push(3);
        expected.push([3, [
            [0.5, 1, 2, 1.5],
            [
                [0, 1, 1, 0.5], 0, 0, 1
            ],
            [
                [1, 1, 3, 2.5], 0, 0, 1
            ], 0
        ]]);
        expect(tdigest.serialize()).to.deep.equal(expected);
    });

    it('from four points', function() {
        var tdigest = new TDigest();
        tdigest.push([10, 11, 12, 13]);
        var expected = _.cloneDeep(arr);
        expected.push(4);
        expected.push(4);
        expected.push([4, [
            [11, 1, 2, 1.5],
            [
                [10, 1, 1, 0.5], 0, 0, 0
            ],
            [
                [12, 1, 3, 2.5], 0, [
                    [13, 1, 4, 3.5], 0, 0, 1
                ], 0
            ], 0
        ]]);
        expect(tdigest.serialize()).to.deep.equal(expected);
    });
});

describe('deserialize', function() {
    it('should deserialize a serialized object', function() {
        var tdigest = new TDigest();
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });

    it('for a single point', function() {
        var tdigest = new TDigest();
        tdigest.push(0);
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });

    it('for two points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 1]);
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });

    it('for three points', function() {
        var tdigest = new TDigest();
        tdigest.push([0, 0.5, 1]);
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });

    it('for four points', function() {
        var tdigest = new TDigest();
        tdigest.push([10, 11, 12, 13]);
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });

    it('for lots of uniformly distributed points', function() {
        var tdigest = new TDigest();
        var i, x = [],
            N = 100000;
        var maxerr = 0;
        for (i = 0; i < N; i += 1) {
            x.push(Math.random());
        }
        tdigest.push(x);
        var serialized = tdigest.serialize();
        var tdigest2 = new TDigest();
        tdigest2.deserialize(serialized)
        expect(tdigest2).to.deep.equal(tdigest);
    });
});
