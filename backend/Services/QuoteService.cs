using AsistenciaLenguas.Api.DTOs;

namespace AsistenciaLenguas.Api.Services
{
    public interface IQuoteService
    {
        LiteraryQuoteDto GetRandomQuote();
    }

    public class QuoteService : IQuoteService
    {
        private static readonly List<LiteraryQuoteDto> Quotes = new()
        {
            new LiteraryQuoteDto
            {
                Text = "One language sets you in a corridor for life. Two languages open every door along the way.",
                Translation = "Un idioma te coloca en un pasillo para toda la vida. Dos idiomas abren todas las puertas del camino.",
                Author = "Frank Smith",
                Language = "Inglés"
            },
            new LiteraryQuoteDto
            {
                Text = "To have another language is to possess a second soul.",
                Translation = "Tener otro idioma es poseer una segunda alma.",
                Author = "Carlomagno",
                Language = "Latín / Francés"
            },
            new LiteraryQuoteDto
            {
                Text = "Wer fremde Sprachen nicht kennt, weiß nichts von seiner eigenen.",
                Translation = "Quien no conoce lenguas extranjeras nada sabe de la propia.",
                Author = "Johann Wolfgang von Goethe",
                Language = "Alemán"
            },
            new LiteraryQuoteDto
            {
                Text = "La lecture est à l'esprit ce que l'exercice est au corps.",
                Translation = "La lectura es a la mente lo que el ejercicio al cuerpo.",
                Author = "Joseph Addison",
                Language = "Francés"
            },
            new LiteraryQuoteDto
            {
                Text = "千里之行，始于足下 (Qiān lǐ zhī xíng, shǐ yú zú xià)",
                Translation = "Un viaje de mil millas comienza con un solo paso.",
                Author = "Lao Tse",
                Language = "Chino Mandarín"
            },
            new LiteraryQuoteDto
            {
                Text = "I limiti del mio linguaggio sono i limiti del mio mondo.",
                Translation = "Los límites de mi lenguaje son los límites de mi mundo.",
                Author = "Ludwig Wittgenstein",
                Language = "Italiano"
            },
            new LiteraryQuoteDto
            {
                Text = "Ler é sonhar pela mão de outrem.",
                Translation = "Leer es soñar de la mano de otro.",
                Author = "Fernando Pessoa",
                Language = "Portugués"
            },
            new LiteraryQuoteDto
            {
                Text = "Without translation, we would be living in provinces bordering on silence.",
                Translation = "Sin traducción, viviríamos en provincias confinadas al silencio.",
                Author = "George Steiner",
                Language = "Inglés"
            }
        };

        private readonly Random _random = new();

        public LiteraryQuoteDto GetRandomQuote()
        {
            int index = _random.Next(Quotes.Count);
            return Quotes[index];
        }
    }
}
