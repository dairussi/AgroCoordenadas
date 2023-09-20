using Tesseract;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using iTextSharp.text.pdf;
using iTextSharp.text.pdf.parser;
using Backend.Interfaces;
using PdfiumViewer;
using System.Drawing;


namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CoordenadasController : ControllerBase

    {
        private static List<string> texts = new List<string>();

        private List<string> PdfText(string tempFilePath)
        {
            using (var reader = new PdfReader(tempFilePath))
            {

                for (int page = 1; page <= reader.NumberOfPages; page++)
                {
                    var strategy = new SimpleTextExtractionStrategy();
                    var currentText = PdfTextExtractor.GetTextFromPage(reader, page, strategy);
                    texts.Add(currentText);
                }


            }
            return texts;
        }

        private List<string> PdfImg(string tempFilePath)
        {
            string outputFolder = @"Tempory/";
            if (Directory.Exists(outputFolder))
            {
                Directory.Delete(outputFolder, true);
            }
            Directory.CreateDirectory(outputFolder);


            static Bitmap ConvertToGrayscale(Bitmap original)
            {
                Bitmap grayscaleBitmap = new Bitmap(original.Width, original.Height);

                for (int y = 0; y < original.Height; y++)
                {
                    for (int x = 0; x < original.Width; x++)
                    {
                        Color originalColor = original.GetPixel(x, y);
                        int luminance = (int)(originalColor.R * 0.3 + originalColor.G * 0.59 + originalColor.B * 0.11);
                        Color grayscaleColor = Color.FromArgb(luminance, luminance, luminance);
                        grayscaleBitmap.SetPixel(x, y, grayscaleColor);
                    }
                }

                return grayscaleBitmap;
            }


            //converte pdf para imagens salva na pasta criada logo acima

            using (PdfiumViewer.PdfDocument pdfDocument = PdfiumViewer.PdfDocument.Load(tempFilePath))
            {
                for (int pageNumber = 0; pageNumber < pdfDocument.PageCount; pageNumber++)
                {
                    using (Image image = pdfDocument.Render(pageNumber, 2200, 2200, 200, 200, PdfRenderFlags.Annotations))
                    {
                        using (Bitmap bitmap = new Bitmap(image))
                        {
                            using (Bitmap grayscaleBitmap = ConvertToGrayscale(bitmap))
                            {
                                string outputFile = System.IO.Path.Combine(outputFolder, $"ToImage-{pageNumber + 1}.png");
                                grayscaleBitmap.Save(outputFile, System.Drawing.Imaging.ImageFormat.Png);
                            }
                        }

                    }
                }
            }


            System.IO.File.Delete(tempFilePath);


            //lê as imagens com tecnologia OCR usando o tesseract
            Environment.SetEnvironmentVariable("TESSDATA_PREFIX", @"./tessdata/");
            using (var engine = new TesseractEngine(@"./tessdata/", "eng", EngineMode.Default))
            {
                string[] imageFiles = Directory.GetFiles(outputFolder, "*.png");
                foreach (var imageFile in imageFiles)
                {
                    using (var img = Pix.LoadFromFile(imageFile))
                    {
                        using (var page = engine.Process(img))
                        {
                            string text = page.GetText();
                            text = text.Replace("\n", " ");
                            text = text.Replace("\r", " ");
                            text = text.Replace("\t", " ");
                            texts.Add(text);
                        }
                    }
                }
            }
            Directory.Delete(outputFolder, true);
            return texts;
        }

        //verifica se o pdf é selecionável
        private bool IsSelectablePdf(string tempFilePath)
        {
            bool isSelectablePdf = false;

            using (var reader = new PdfReader(tempFilePath))
            {
                for (int page = 1; page <= reader.NumberOfPages; page++)
                {
                    var strategy = new SimpleTextExtractionStrategy();
                    var currentText = PdfTextExtractor.GetTextFromPage(reader, page, strategy);
                    if (!string.IsNullOrWhiteSpace(currentText))
                    {
                        isSelectablePdf = true;
                        break;
                    }
                }
            }

            return isSelectablePdf;
        }



        private readonly IFilter _filter;
        public CoordenadasController(IFilter filter)
        {
            _filter = filter;

        }


        [HttpPost]
        [Route("ExtracaoPdf")]
        public IActionResult ExtracaoPdf([FromForm] PdfModels pdfModels)
        {
            texts.Clear();

            try
            {
                //recebimento e validação do pdf
                if (pdfModels.PdfFile == null)
                {
                    return BadRequest("Por favor envie um PDF válido.");
                }
                string nomeDoArquivoNormalizado = pdfModels.PdfFile.FileName.Normalize(System.Text.NormalizationForm.FormD);
                string tempFilePath = System.IO.Path.Combine(System.IO.Path.GetTempPath(), nomeDoArquivoNormalizado);
                using (var fileStream = new FileStream(tempFilePath, FileMode.Create))
                {
                    pdfModels.PdfFile.CopyTo(fileStream);
                }

                bool isSelectablePdf = IsSelectablePdf(tempFilePath);

                List<string>? textFromPdfText = null;
                List<string>? textFromPdfImg = null;


                if (isSelectablePdf)
                {
                    textFromPdfText = PdfText(tempFilePath);
                    textFromPdfImg = PdfImg(tempFilePath);
                    if (textFromPdfText.Count > textFromPdfImg.Count)
                    {
                        texts = textFromPdfText;
                    }
                    else
                    {
                        texts = textFromPdfImg;
                    }

                }

                else
                {
                    textFromPdfImg = PdfImg(tempFilePath);
                    texts = textFromPdfImg;
                }
                return Ok(texts);
            }

            catch (Exception ex)
            {
                return BadRequest($"Error converting PDF to images: {ex.Message}");

            }
        }


        [HttpPost]
        [Route("Filters")]
        public IActionResult Filters()
        {
            try
            {
                Dictionary<string, List<string>> results = new Dictionary<string, List<string>>();

                foreach (var text in texts)
                {
                    var coordinates = _filter.Filter(text);
                    foreach (var kvp in coordinates)
                    {
                        if (!results.ContainsKey(kvp.Key))
                        {
                            results[kvp.Key] = new List<string>();
                        }
                        results[kvp.Key].AddRange(kvp.Value);
                    }
                }
                texts.Clear();

                return Ok(results);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error filtering data: {ex.Message}");
            }
        }

    }
}
