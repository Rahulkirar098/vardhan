import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import AppRoutes from './routes';
import theme from './theme/themeProvider';
import { SnackbarProvider } from './theme/SnackbarProvider';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
