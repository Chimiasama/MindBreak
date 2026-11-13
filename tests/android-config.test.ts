import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import config from '../capacitor.config';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Android loads the bundled game locally rather than a remote preview server', () => {
  assert.equal(config.appId, 'com.chimiasama.mindbreak');
  assert.equal(config.webDir, 'dist');
  assert.equal(config.server?.androidScheme, 'https');
  assert.equal(config.server?.url, undefined);
});

test('Android build preserves TLS/checksum verification and pins compatible toolchain versions', () => {
  const wrapper = read('android/gradle/wrapper/gradle-wrapper.properties');
  assert.match(wrapper, /gradle-8\.14\.3-bin\.zip/);
  assert.match(wrapper, /distributionSha256Sum=[a-f0-9]{64}/);
  assert.match(wrapper, /validateDistributionUrl=true/);
  assert.match(read('android/variables.gradle'), /compileSdkVersion = 36/);
  assert.match(read('android/build.gradle'), /com.android.tools.build:gradle:8\.13\.0/);
  assert.match(read('android/app/build.gradle'), /versionCode = Integer.parseInt/);
});

test('an unused empty Cordova project is not added to the native build', () => {
  assert.doesNotMatch(read('android/settings.gradle'), /include ':capacitor-cordova-android-plugins'/);
  assert.doesNotMatch(read('android/app/build.gradle'), /implementation project\(':capacitor-cordova-android-plugins'\)/);
});
