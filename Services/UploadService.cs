using TravelSpotFinder.Api.Common;

namespace TravelSpotFinder.Api.Services;

public sealed class UploadService
{
    private const long MaxFileSize = 5 * 1024 * 1024;
    private static readonly string[] AllowedMimePrefix = { "image/" };

    private readonly IWebHostEnvironment _environment;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UploadService(IWebHostEnvironment environment, IHttpContextAccessor httpContextAccessor)
    {
        _environment = environment;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<object> SaveImageAsync(IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            throw new ApiException("File is required", StatusCodes.Status400BadRequest);
        }

        if (file.Length > MaxFileSize)
        {
            throw new ApiException("File too large (max 5MB)", StatusCodes.Status400BadRequest);
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedMimePrefix.Any(prefix => file.ContentType.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
        {
            throw new ApiException("Only image files are allowed", StatusCodes.Status400BadRequest);
        }

        var uploadsRoot = Path.Combine(_environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Random.Shared.Next(100_000_000, 999_999_999)}{extension}";
        var targetPath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = File.Create(targetPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        var host = request is not null ? $"{request.Scheme}://{request.Host.Value}" : string.Empty;
        var relativePath = $"/uploads/{fileName}";
        var absoluteUrl = string.IsNullOrEmpty(host) ? relativePath : host + relativePath;

        return new
        {
            file_name = fileName,
            url = absoluteUrl,
            path = relativePath,
            size = file.Length,
            mime_type = file.ContentType
        };
    }
}
