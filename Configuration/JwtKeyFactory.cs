using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TravelSpotFinder.Api.Configuration;

public static class JwtKeyFactory
{
    public static SymmetricSecurityKey Create(string secret)
    {
        var material = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        return new SymmetricSecurityKey(material);
    }
}
