import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UiState = {
  breakingNewsOpen: boolean;
  activeCategory: string;
};

const initialState: UiState = {
  breakingNewsOpen: true,
  activeCategory: "Top Stories"
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setBreakingNewsOpen(state, action: PayloadAction<boolean>) {
      state.breakingNewsOpen = action.payload;
    },
    setActiveCategory(state, action: PayloadAction<string>) {
      state.activeCategory = action.payload;
    }
  }
});

export const { setBreakingNewsOpen, setActiveCategory } = uiSlice.actions;

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
