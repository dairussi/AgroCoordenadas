using System.Text.RegularExpressions;
using Backend.Interfaces;
using System.Collections.Generic;

namespace Backend.Services
{
    public class FilterService : IFilter
    {
        public Dictionary<string, List<string>> Filter(string text)
        {
            string pattern1 = @"(?<=\s+N\s+|\(\s*N\s*|\s*N=\s*)([\d,.]+)";
            string pattern2 = @"(?<=\s+E\s+|\(\s*E\s*|\s*E=\s*)([\d,.]+)";
            string pattern3 = @"(?<=\s*Latitude:\s+|\s*Latitude\s*de\s*|\s*Latitude\s+|\s*Lat\s+|\s*Lat:\s+|\(Latitude:\s+|\(Latitude\s+|\(Lat\s+|\(Lat:\s+)([-+°'”\s\d,.]+)("")";
            string pattern4 = @"(?<=\s*Longitude:\s+|\s*Longitude\s*de\s*|\s*Longitude\s+|\s*Long\s+|\s*Long:\s+|\(Longitude:\s+|\(Longitude\s+|\(Long\s+|\(Long:\s+)([-+°'""”\s\d,.]+)("")";

            HashSet<string> seenValues1 = new();
            HashSet<string> seenValues2 = new();
            HashSet<string> seenValues3 = new();
            HashSet<string> seenValues4 = new();

            List<string> filteredNumbers1 = new();
            List<string> filteredNumbers2 = new();
            List<string> filteredNumbers3 = new();
            List<string> filteredNumbers4 = new();


            MatchCollection matches1 = Regex.Matches(text, pattern1);
            MatchCollection matches2 = Regex.Matches(text, pattern2);
            MatchCollection matches3 = Regex.Matches(text, pattern3);
            MatchCollection matches4 = Regex.Matches(text, pattern4);


            foreach (Match match in matches1)
            {
                string formattedValue = FormatValue(match.Value);
                if (seenValues1.Add(formattedValue))
                {
                    filteredNumbers1.Add(formattedValue);
                }

            }



            foreach (Match match in matches2)
            {
                string formattedValue = FormatValue(match.Value);
                if (seenValues2.Add(formattedValue))
                {
                    filteredNumbers2.Add(formattedValue);
                }
            }



            foreach (Match match in matches3)
            {
                string formattedValue = FormatValue(match.Value);
                if (seenValues3.Add(formattedValue))
                {
                    filteredNumbers3.Add(formattedValue);
                }
            }



            foreach (Match match in matches4)
            {
                string formattedValue = FormatValue(match.Value);
                if (seenValues4.Add(formattedValue))
                {
                    filteredNumbers4.Add(formattedValue);
                }
            }

            Dictionary<string, List<string>> results = new Dictionary<string, List<string>>
            {
                { "N", filteredNumbers1 },
                { "E", filteredNumbers2 },
                { "Latitude", filteredNumbers3 },
                { "Longitude", filteredNumbers4 }
            };

            return results;
        }

        private string FormatValue(string value)
        {
            string formattedValue = value.Replace(" ", "");
            return formattedValue;
        }

    }
}
    



