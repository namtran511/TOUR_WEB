using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Category;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Route("api/categories")]
public sealed class CategoriesController : ApiControllerBase
{
    private readonly CategoryService _categoryService;

    public CategoriesController(CategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? page, [FromQuery] int? limit, [FromQuery] string? sort_by, [FromQuery] string? sort_order, CancellationToken cancellationToken)
        => Success("Get categories successful", await _categoryService.ListAsync(page, limit, sort_by, sort_order, cancellationToken));

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Success("Get category successful", await _categoryService.GetByIdAsync(id, cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] create_category_request request, CancellationToken cancellationToken)
        => Success("Create category successful", await _categoryService.CreateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] update_category_request request, CancellationToken cancellationToken)
        => Success("Update category successful", await _categoryService.UpdateAsync(id, request, cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _categoryService.DeleteAsync(id, cancellationToken);
        return Success("Delete category successful");
    }
}
