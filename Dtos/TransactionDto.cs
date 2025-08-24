namespace FinanceApp.Dtos
{
    public class TransactionDto
    {
        public decimal Amount { get; set; }
        public string Type { get; set; }
        public string Category { get; set; }
        public string Date { get; set; }
        public string Description { get; set; }
    }
}
