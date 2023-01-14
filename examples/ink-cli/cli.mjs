#!/usr/bin/env node
import { useSequential } from 'react-seq';
import { render } from 'ink';
import main from "./main.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
function App() {
  return useSequential(main, []);
}
render( /*#__PURE__*/_jsx(App, {}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJ1c2VTZXF1ZW50aWFsIiwicmVuZGVyIiwibWFpbiIsIkFwcCJdLCJzb3VyY2VzIjpbImNsaS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IHsgdXNlU2VxdWVudGlhbCB9IGZyb20gJ3JlYWN0LXNlcSc7XG5pbXBvcnQgeyByZW5kZXIgfSBmcm9tICdpbmsnO1xuaW1wb3J0IG1haW4gZnJvbSAnLi9tYWluLmpzeCc7XG5cbmZ1bmN0aW9uIEFwcCgpIHtcbiAgcmV0dXJuIHVzZVNlcXVlbnRpYWwobWFpbiwgW10pO1xufVxuXG5yZW5kZXIoPEFwcCAvPik7XG4iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0EsU0FBU0EsYUFBYSxRQUFRLFdBQVc7QUFDekMsU0FBU0MsTUFBTSxRQUFRLEtBQUs7QUFDNUIsT0FBT0MsSUFBSTtBQUFtQjtBQUU5QixTQUFTQyxHQUFHLEdBQUc7RUFDYixPQUFPSCxhQUFhLENBQUNFLElBQUksRUFBRSxFQUFFLENBQUM7QUFDaEM7QUFFQUQsTUFBTSxlQUFDLEtBQUMsR0FBRyxLQUFHLENBQUMifQ==