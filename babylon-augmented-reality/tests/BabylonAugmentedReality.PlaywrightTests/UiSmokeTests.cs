using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

namespace BabylonAugmentedReality.PlaywrightTests;

/// <summary>
/// Smoke tests: routing, layout, and AR shell affordances. WebXR is not available in headless Chromium.
/// Full Babylon + IFC validation is marked explicit (GPU, CDN, WASM).
/// </summary>
[Parallelizable(ParallelScope.None)]
public sealed class UiSmokeTests : PageTest
{
    private static string BaseUrl =>
        Environment.GetEnvironmentVariable("BABYLON_AR_BASE_URL") ?? "http://localhost:5275";

    [Test]
    public async Task Home_PreviewQuery_LoadsShellAndControls()
    {
        await Page.GotoAsync(
            $"{BaseUrl}/?preview=1&nullengine=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.Load });

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Babylon augmented reality" }))
            .ToBeVisibleAsync();

        await Expect(Page.GetByTestId("enter-ar-button")).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("ifc-input")).ToBeVisibleAsync();

        var box = await Page.GetByTestId("ar-canvas").BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);
        Assert.That(box!.Width, Is.GreaterThan(32));
        Assert.That(box.Height, Is.GreaterThan(32));
    }

    [Test]
    [Explicit("Run with app up; depends on Babylon CDN + web-ifc WASM loading in the browser.")]
    public async Task Home_ViewerBoots_OutOfInitializing()
    {
        await Page.GotoAsync(
            $"{BaseUrl}/?preview=1&nullengine=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.Load });

        await Expect(Page.GetByTestId("ar-status")).Not.ToContainTextAsync(
            "Initializing",
            new LocatorAssertionsToContainTextOptions { Timeout = 180_000 });
    }

    [Test]
    [Explicit("IFC pipeline; run manually when validating web-ifc + geometry.")]
    public async Task Home_IfcUpload_UpdatesStatus()
    {
        await Page.GotoAsync(
            $"{BaseUrl}/?preview=1&nullengine=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.Load });

        await Expect(Page.GetByTestId("ar-status")).Not.ToContainTextAsync(
            "Initializing",
            new LocatorAssertionsToContainTextOptions { Timeout = 180_000 });

        var samplePath = Path.Combine(AppContext.BaseDirectory, "Assets", "minimal.ifc");
        Assert.That(File.Exists(samplePath), Is.True, "Sample IFC must be copied to output.");

        await Page.Locator("input[type=\"file\"]").SetInputFilesAsync(samplePath);

        await Expect(Page.GetByTestId("ar-status")).ToContainTextAsync(
            "IFC",
            new LocatorAssertionsToContainTextOptions { Timeout = 120_000 });
    }
}
