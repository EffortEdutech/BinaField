plugins {
    id("com.android.application")
}

android {
    namespace = "io.binafield.fieldtest"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.binafield.fieldtest"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.6.1-b6b"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    testOptions {
        execution = "ANDROIDX_TEST_ORCHESTRATOR"
        animationsDisabled = true
    }
}

dependencies {
    implementation("androidx.room:room-runtime:2.8.5")
    annotationProcessor("androidx.room:room-compiler:2.8.5")

    androidTestImplementation("androidx.test:core:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test:rules:1.7.0")
    androidTestImplementation("androidx.room:room-testing:2.8.5")
    androidTestUtil("androidx.test:orchestrator:1.6.1")
}
