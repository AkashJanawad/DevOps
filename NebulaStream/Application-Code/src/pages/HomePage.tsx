import Stack from "@mui/material/Stack";
import { COMMON_TITLES } from "src/constant";
import HeroSection from "src/components/HeroSection";
import { genreSliceEndpoints } from "src/store/slices/genre";
import { MEDIA_TYPE } from "src/types/Common";
import { CustomGenre, Genre } from "src/types/Genre";
import SliderRowForGenre from "src/components/VideoSlider";
import store from "src/store";

export async function loader() {
  await store.dispatch(
    genreSliceEndpoints.getGenres.initiate(MEDIA_TYPE.Movie)
  );
  return null;
}
export function Component() {
  return (
    <Stack spacing={2}>
      <HeroSection mediaType={MEDIA_TYPE.Movie} />
      {COMMON_TITLES.map((genre: Genre | CustomGenre) => (
        <SliderRowForGenre
          key={genre.id || genre.name}
          genre={genre}
          mediaType={MEDIA_TYPE.Movie}
        />
      ))}
    </Stack>
  );
}

Component.displayName = "HomePage";
