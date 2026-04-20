namespace TravelSpotFinder.Api.Common;

public static class PaginationHelpers
{
    public static (int page, int limit, int skip) GetPagination(int? page, int? limit)
    {
        var safePage = Math.Max(page ?? 1, 1);
        var safeLimit = Math.Clamp(limit ?? 10, 1, 100);
        var skip = (safePage - 1) * safeLimit;

        return (safePage, safeLimit, skip);
    }

    public static object CreatePagination(int page, int limit, int total)
        => new
        {
            page,
            limit,
            total,
            total_pages = total <= 0 ? 0 : (int)Math.Ceiling(total / (double)limit)
        };
}
