using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

namespace BabylonAugmentedReality.PlaywrightTests;

/// <summary>
/// Browser tests for the AR shell. WebXR is not available in headless Chromium, so assertions target
/// preview mode (?preview=1) and DOM affordances. On-device AR is validated manually or via vendor tools.
/// </summary>
[Parallelizable(ParallelScope.Self)]
public sealed class UiSmokeTests : PageTest
{
    private static string BaseUrl =>
        Environment.GetEnvironmentVariable("BABYLON_AR_BASE_URL") ?? "http://localhost:5275";

    [Test]
    public async Task Home_PreviewMode_RendersCanvasAndStatus()
    {
        await Page.GotoAsync($"{BaseUrl}/?preview=1");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.GetByTestId("ar-status")).ToContainTextAsync("Preview mode");

        var box = await Page.GetByTestId("ar-canvas").BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);
        Assert.That(box!.Width, Is.GreaterThan(64));
        Assert.That(box.Height, Is.GreaterThan(64));
    }

    [Test]
    public async Task Home_HasEnterArAndIfcPicker()
    {
        await Page.GotoAsync($"{BaseUrl}/?preview=1");
        await Expect(Page.GetByTestId("enter-ar-button")).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("ifc-input")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Home_IfcUpload_UpdatesStatus()
    {
        await Page.GotoAsync($"{BaseUrl}/?preview=1");
        var samplePath = Path.Combine(AppContext.BaseDirectory, "Assets", "minimal.ifc");
        Assert.That(File.Exists(samplePath), Is.True, "Sample IFC must be copied to output.");

        var fileInput = Page.Locator("input[type=\"file\"]");
        await fileInput.SetInputFilesAsync(samplePath);

        await Expect(Page.GetByTestId("ar-status")).ToContainTextAsync(
            "IFC",
            new LocatorAssertionsOptions { Timeout = 60_000 });
    }
}
