using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<Models.Transaction> Transactions=> Set<Models.Transaction>();
        public DbSet<Models.User> Users => Set<Models.User>();
    }
}