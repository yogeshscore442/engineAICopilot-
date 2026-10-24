# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Google Maps
-keep class com.google.android.gms.** { *; }
-keep class com.google.maps.** { *; }
-dontwarn com.google.android.gms.**
-dontwarn com.google.maps.**

# Kotlin Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Kotlinx Serialization
-keep class kotlinx.serialization.** { *; }
-dontwarn kotlinx.serialization.**

# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Material3
-keep class androidx.compose.material3.** { *; }
-dontwarn androidx.compose.material3.**

# Keep model classes for serialization
-keep class com.medical.navigation.model.** { *; }

# Keep ViewModels
-keep class com.medical.navigation.viewmodel.** { *; }

# Keep UI components
-keep class com.medical.navigation.ui.** { *; }

# Keep screen composables
-keep class com.medical.navigation.screen.** { *; }