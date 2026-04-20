using System.ComponentModel.DataAnnotations;

namespace TravelSpotFinder.Api.Dtos.Auth;

public sealed class register_request
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string full_name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string email { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 6)]
    public string password { get; set; } = string.Empty;

    [Url]
    [StringLength(255)]
    public string? avatar_url { get; set; }
}

public sealed class login_request
{
    [Required]
    [EmailAddress]
    public string email { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 6)]
    public string password { get; set; } = string.Empty;
}
