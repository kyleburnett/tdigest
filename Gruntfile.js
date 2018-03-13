module.exports = function(grunt) {

    // Load the tasks
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.initConfig({
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*.js']
            }
        },
        browserify: {
            dist: {
                files: {
                    'dist/tdigest.min.js': ['./index.js']
                },
                options: {
                    transform: ['uglifyify'],
                    browserifyOptions: {
                        standalone: 'TDigest'
                    }
                }
            }
        }
    });

    grunt.registerTask('test', 'mochaTest');
    grunt.registerTask('build', 'browserify:dist');
    grunt.registerTask('default', ['test', 'build']);

};