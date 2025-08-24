using System.ComponentModel.DataAnnotations.Schema;

namespace FinanceApp.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public int UserId { get; set; }

        [NotMapped]
        public string Type => Amount >= 0 ? "Income" : "Expense";
    }
}
