import { API_ENDPOINT_URL, TMDB_V3_API_KEY } from "src/constant";
import { PaginatedMovieResult } from "src/types/Common";
import { Movie } from "src/types/Movie";

const movieResultSorter = (left: Movie, right: Movie) => {
  const leftScore =
    (left.poster_path ? 2 : 0) +
    (left.backdrop_path ? 1 : 0) +
    left.vote_average +
    left.popularity / 100;
  const rightScore =
    (right.poster_path ? 2 : 0) +
    (right.backdrop_path ? 1 : 0) +
    right.vote_average +
    right.popularity / 100;

  return rightScore - leftScore;
};

export async function searchMovieByTitle(
  title: string,
  signal?: AbortSignal
): Promise<Movie | null> {
  if (!TMDB_V3_API_KEY || !title.trim()) {
    return null;
  }

  const searchUrl = new URL("/search/movie", API_ENDPOINT_URL);
  searchUrl.searchParams.set("api_key", TMDB_V3_API_KEY);
  searchUrl.searchParams.set("query", title.trim());
  searchUrl.searchParams.set("include_adult", "false");

  const response = await fetch(searchUrl.toString(), { signal });

  if (!response.ok) {
    throw new Error("Unable to search TMDB right now.");
  }

  const payload = (await response.json()) as PaginatedMovieResult;
  const sortedResults = [...payload.results].sort(movieResultSorter);

  return sortedResults[0] ?? null;
}
