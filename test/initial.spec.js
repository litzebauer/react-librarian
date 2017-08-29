'use strict';

const sinon = require('sinon');
const tap = require('tap');

const initial = require('../commands/initial');
const {
    colorize,
    input
} = require('../tools');
const utils = require('./test-utils');

const sandbox = sinon.sandbox.create();

tap.test('Command: initial', (suite) => {
    let make;
    let mocks;

    suite.beforeEach((done) => {
        make = utils.make(initial);
        mocks = utils.mock(sandbox);

        mocks.fs.exists.callsFake((value) =>
            value === '/manual//root/.git' || mocks.fs.realExists(value)
        );
        mocks.findPackageJson.returns('/root/package.json');
        mocks.include.callsFake((filePath) => {
            if (filePath === '/root/package.json') {
                return {
                    name: 'fake-library',
                    repository: { url: 'https://fake.repo' },
                    version: '100.200.300'
                };
            }
        });

        done();
    });

    suite.afterEach((done) => {
        sandbox.restore();
        done();
    });

    suite.test('should call erector.inquire', (test) => {
        test.plan(2);

        make().catch(() => {
            test.ok(mocks.erector.inquire.calledOnce);
            test.ok(mocks.erector.inquire.calledWith(
                [
                    {
                        defaultAnswer: 'fake-library',
                        name: 'name',
                        question: 'Library name:',
                        transform: sinon.match.instanceOf(Function)
                    },
                    {
                        name: 'packageName',
                        useAnswer: 'name',
                        transform: sinon.match.instanceOf(Function)
                    },
                    {
                        name: 'componentName',
                        useAnswer: 'packageName',
                        transform: sinon.match.instanceOf(Function)
                    },
                    {
                        defaultAnswer: 'https://fake.repo',
                        name: 'repoUrl',
                        question: 'Repository URL:'
                    },
                    {
                        defaultAnswer: '100.200.300',
                        name: 'version',
                        question: 'Version:'
                    },
                    {
                        defaultAnswer: sinon.match.instanceOf(Function),
                        name: 'readmeTitle',
                        question: 'README Title:'
                    },
                    {
                        defaultAnswer: 'N',
                        name: 'git',
                        question: 'Re-initialize Git?'
                    }
                ],
                true,
                {
                    git: input.convertYesNoValue
                }
            ));
            test.done();
        });
    });

    suite.test('should have a library name transform that checks format', (test) => {
        test.plan(18);

        make().catch(() => {
            const { transform } = mocks.erector.inquire.firstCall.args[0][0];
            const colorz = sandbox.stub(colorize, 'colorize');

            colorz.callsFake((message) => message);

            test.equal(transform(), '');
            test.equal(transform(123), null);
            test.equal(transform('a'.repeat(215)), null);
            test.equal(transform(' a   '), null);
            test.equal(transform('A'), null);
            test.equal(transform('.a'), null);
            test.equal(transform('_a'), null);
            test.equal(transform('-a'), null);
            test.equal(transform('a.'), null);
            test.equal(transform('a_'), null);
            test.equal(transform('a-'), null);
            test.equal(transform('@scope/package/nope'), null);
            test.equal(transform('package/nope'), null);
            test.equal(transform('$houlnt-work'), null);
            test.ok(mocks.log.calledWith(
                '    Package name must have no capitals or special\n' +
                '    characters and be one of the below formats:\n' +
                '        @scope/package-name\n' +
                '        package-name'
            ));
            test.equal(mocks.log.callCount, 13);
            test.equal(transform('@scope/package'), '@scope/package');
            test.equal(transform('package-name12'), 'package-name12');

            test.end();
        });
    });

    suite.test('should have a packageName question transform that extracts the package name without a scope', (test) => {
        test.plan(2);

        make().catch(() => {
            const { transform } = mocks.erector.inquire.lastCall.args[0][1];

            test.equal(transform('@myscope/package-name'), 'package-name');
            test.equal(transform('my-package'), 'my-package');

            test.end();
        });
    });

    suite.test('should have a readmeTitle question defaultAnswer that converts the packagenName into words', (test) => {
        test.plan(2);

        mocks.erector.inquire.rejects();
        mocks.case.dashToWords.returns('Herds of Words');

        make().catch(() => {
            const { defaultAnswer } = mocks.erector.inquire.lastCall.args[0][5];

            test.equal(defaultAnswer([null, { answer: 'this-is-patrick' }]), 'Herds of Words');
            test.ok(mocks.case.dashToWords.calledWith('this-is-patrick'));
            test.end();
        });
    });

    suite.end();
});
