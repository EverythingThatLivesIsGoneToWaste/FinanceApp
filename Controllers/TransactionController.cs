using FinanceApp.Dtos;
using Microsoft.AspNetCore.Mvc;
using FinanceApp.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using FinanceApp.Data;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Globalization;
using System.Threading.Tasks;

namespace FinanceApp.Controllers
{
    [Route("api/transactions")]
    [ApiController]
    public class TransactionController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly JwtSettings _jwtSettings;

        public TransactionController(AppDbContext db, IOptions<JwtSettings> jwtSettings)
        {
            _db = db;
            _jwtSettings = jwtSettings.Value;
        }

        [HttpPost("add-transaction")]
        [Authorize]
        public async Task<IActionResult> AddTransaction([FromBody] TransactionDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var dateUtc = DateTime.SpecifyKind(
                DateTime.Parse(dto.Date),
                DateTimeKind.Utc
            );

            var transaction = new Transaction
            {
                Amount = dto.Type == "Income" ? dto.Amount : -dto.Amount,
                Category = dto.Category,
                Date = dateUtc,
                Description = dto.Description,
                UserId = userId
            };

            _db.Transactions.Add(transaction);
            await _db.SaveChangesAsync();

            return Ok(transaction);
        }

        [HttpGet("get-transactions")]
        [Authorize]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? type = null,
            [FromQuery] string? category = null,
            [FromQuery] string? month = null
            )
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var query = _db.Transactions
            .Where(t => t.UserId == userId)
            .AsQueryable();

            if (!string.IsNullOrEmpty(type))
            {
                query = type.ToLower() switch
                {
                    "income" => query.Where(t => t.Amount > 0),
                    "expense" => query.Where(t => t.Amount < 0),
                    _ => query
                };
            }

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(t => t.Category == category);
            }

            if (!string.IsNullOrEmpty(month))
            {
                if (DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var monthDate))
                {
                    query = query.Where(t =>
                        t.Date.Year == monthDate.Year &&
                        t.Date.Month == monthDate.Month);
                }
            }

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            return Ok(transactions);
        }

        [HttpDelete("delete-transaction{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var transaction = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return NotFound($"Транзакция с ID {id} не найдена");

            _db.Transactions.Remove(transaction);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("analytics")]
        [Authorize]
        public IActionResult GetAnalytics()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            return Ok(new
            {
                expensesByCategory = _db.Transactions
                    .Where(t => t.UserId == userId && t.Amount < 0)
                    .GroupBy(t => t.Category)
                    .Select(g => new {
                        category = g.Key,
                        amount = -g.Sum(t => t.Amount)
                    }),

                incomeByCategory = _db.Transactions
                    .Where(t => t.UserId == userId && t.Amount > 0)
                    .GroupBy(t => t.Category)
                    .Select(g => new {
                        category = g.Key,
                        amount = g.Sum(t => t.Amount)
                    })
            });
        }

        [HttpGet("balance")]
        [Authorize]
        public async Task<decimal> GetBalance()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return await _db.Transactions
                .Where(t => t.UserId == userId)
                .SumAsync(t => t.Amount);
        }

        [HttpGet("analytics/monthly")]
        [Authorize]
        public async Task<IActionResult> GetMonthlyAnalytics()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var monthlyData = await _db.Transactions
                .Where(t => t.UserId == userId)
                .GroupBy(t => new {
                    Year = t.Date.Year,
                    Month = t.Date.Month
                })
                .Select(g => new {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Income = g.Where(t => t.Amount > 0).Sum(t => (decimal?)t.Amount) ?? 0,
                    Expenses = g.Where(t => t.Amount < 0).Sum(t => (decimal?)t.Amount) ?? 0,
                    Balance = g.Sum(t => (decimal?)t.Amount) ?? 0
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            var result = monthlyData.Select(x => new {
                Period = $"{x.Year}-{x.Month:D2}",
                x.Income,
                x.Expenses,
                x.Balance
            }).ToList();

            return Ok(result);
        }
    }
}
