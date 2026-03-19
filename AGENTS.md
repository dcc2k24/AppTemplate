# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **.NET 8 MAUI** (Multi-platform App UI) template application — a single cross-platform client app with no backend services, databases, or APIs. The solution contains one project: `AppTemplate.csproj`.

### Build / restore

On Linux, only the **Android** target framework (`net8.0-android`) can be built. The other targets (iOS, macCatalyst, Windows) require their respective platform SDKs.

```bash
# Restore (Android only)
dotnet restore AppTemplate.csproj -p:TargetFramework=net8.0-android -p:AndroidSdkDirectory=/opt/android-sdk

# Build (Android only)
dotnet build AppTemplate.csproj -f net8.0-android -p:AndroidSdkDirectory=/opt/android-sdk
```

The build produces an APK at `bin/Debug/net8.0-android/com.companyname.apptemplate-Signed.apk`.

### Environment variables

The following must be set (already in `~/.bashrc`):

| Variable | Value |
|---|---|
| `DOTNET_ROOT` | `/usr/share/dotnet` |
| `ANDROID_HOME` | `/opt/android-sdk` |
| `ANDROID_SDK_ROOT` | `/opt/android-sdk` |

### Gotchas

- The `platform-tools` Android SDK component **must** be installed (via `sdkmanager "platform-tools"`), or the `ResolveSdks` MSBuild task will fail with `XA5300` even if the SDK path is correct.
- Java source/target 8 warnings (`JAVAC : warning : [options] source value 8 is obsolete`) are expected with JDK 21 and harmless.
- When restoring, use `-p:TargetFramework=net8.0-android` to avoid errors about missing iOS/macCatalyst/Windows workloads that cannot be installed on Linux.
- There are no automated tests, lint tools, or CI configuration in this repository.
