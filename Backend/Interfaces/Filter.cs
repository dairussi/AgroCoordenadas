namespace Backend.Interfaces
{
    public interface IFilter
    {
        Dictionary<string, List<string>> Filter(string text);
    }
}
