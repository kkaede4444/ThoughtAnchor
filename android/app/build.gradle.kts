plugins { id("com.android.application") }
android {
    namespace = "io.github.kkaidoumitsuka.thoughtanchor"
    compileSdk = 36
    defaultConfig { applicationId = "io.github.kkaidoumitsuka.thoughtanchor"; minSdk = 26; targetSdk = 36; versionCode = 500; versionName = "0.5.0" }
    signingConfigs {
        create("localRelease") { storeFile = file(System.getenv("THOUGHTANCHOR_KEYSTORE") ?: "../../.local/android-signing/release.jks"); storePassword = System.getenv("THOUGHTANCHOR_SIGNING_PASSWORD"); keyAlias = "thoughtanchor"; keyPassword = storePassword }
    }
    buildTypes {
        release { signingConfig = signingConfigs.getByName("localRelease"); isMinifyEnabled = false }
        debug { applicationIdSuffix = ".test" }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
}
