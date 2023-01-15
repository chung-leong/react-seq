import { delay } from 'react-seq';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { jsx as _jsx } from "react/jsx-runtime";
import { Fragment as _Fragment } from "react/jsx-runtime";
import { jsxs as _jsxs } from "react/jsx-runtime";
const Spinner = InkSpinner.default;
export default async function* main({
  fallback
}) {
  fallback( /*#__PURE__*/_jsx(Text, {}));
  let phase = 1;
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase
  });
  await stealUnderpants();
  phase++;
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase
  });
  await _?.();
  phase++;
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase
  });
  await collectProfits();
  phase++;
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase
  });
}
async function stealUnderpants() {
  await delay(3000);
}
async function _() {
  await delay(3000);
}
async function collectProfits() {
  await delay(3000);
}
function BusinessPlan({
  phase
}) {
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsx(Phase, {
      number: 1,
      current: phase,
      children: "Stealing underpants"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 2,
      current: phase,
      children: "???"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 3,
      current: phase,
      children: "Collecting profits"
    })]
  });
}
function Phase({
  number,
  current,
  children
}) {
  let status,
    bold = false;
  if (current === number) {
    status = /*#__PURE__*/_jsx(Text, {
      color: "green",
      children: /*#__PURE__*/_jsx(Spinner, {})
    });
    bold = true;
  } else if (current > number) {
    status = /*#__PURE__*/_jsx(Text, {
      color: "yellow",
      children: '\u2713'
    });
  } else {
    status = /*#__PURE__*/_jsx(Text, {
      children: " "
    });
  }
  return /*#__PURE__*/_jsxs(Text, {
    bold: bold,
    children: [" ", status, " ", children]
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJkZWxheSIsIlRleHQiLCJJbmtTcGlubmVyIiwiU3Bpbm5lciIsImRlZmF1bHQiLCJtYWluIiwiZmFsbGJhY2siLCJwaGFzZSIsInN0ZWFsVW5kZXJwYW50cyIsIl8iLCJjb2xsZWN0UHJvZml0cyIsIkJ1c2luZXNzUGxhbiIsIlBoYXNlIiwibnVtYmVyIiwiY3VycmVudCIsImNoaWxkcmVuIiwic3RhdHVzIiwiYm9sZCJdLCJzb3VyY2VzIjpbIm1haW4uanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlbGF5IH0gZnJvbSAncmVhY3Qtc2VxJztcbmltcG9ydCB7IFRleHQgfSBmcm9tICdpbmsnO1xuaW1wb3J0IElua1NwaW5uZXIgZnJvbSAnaW5rLXNwaW5uZXInO1xuXG5jb25zdCBTcGlubmVyID0gSW5rU3Bpbm5lci5kZWZhdWx0O1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiogbWFpbih7IGZhbGxiYWNrIH0pIHtcbiAgZmFsbGJhY2soPFRleHQgLz4pO1xuICBsZXQgcGhhc2UgPSAxO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZX0gLz47XG4gIGF3YWl0IHN0ZWFsVW5kZXJwYW50cygpO1xuICBwaGFzZSsrO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZX0gLz47XG4gIGF3YWl0IF8/LigpO1xuICBwaGFzZSsrO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZX0gLz47XG4gIGF3YWl0IGNvbGxlY3RQcm9maXRzKCk7XG4gIHBoYXNlKys7XG4gIHlpZWxkIDxCdXNpbmVzc1BsYW4gcGhhc2U9e3BoYXNlfSAvPjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3RlYWxVbmRlcnBhbnRzKCkge1xuICBhd2FpdCBkZWxheSgzMDAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gXygpIHtcbiAgYXdhaXQgZGVsYXkoMzAwMCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RQcm9maXRzKCkge1xuICBhd2FpdCBkZWxheSgzMDAwKTtcbn1cblxuZnVuY3Rpb24gQnVzaW5lc3NQbGFuKHsgcGhhc2UgfSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8UGhhc2UgbnVtYmVyPXsxfSBjdXJyZW50PXtwaGFzZX0+U3RlYWxpbmcgdW5kZXJwYW50czwvUGhhc2U+XG4gICAgICA8UGhhc2UgbnVtYmVyPXsyfSBjdXJyZW50PXtwaGFzZX0+Pz8/PC9QaGFzZT5cbiAgICAgIDxQaGFzZSBudW1iZXI9ezN9IGN1cnJlbnQ9e3BoYXNlfT5Db2xsZWN0aW5nIHByb2ZpdHM8L1BoYXNlPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBQaGFzZSh7IG51bWJlciwgY3VycmVudCwgY2hpbGRyZW4gfSkge1xuICBsZXQgc3RhdHVzLCBib2xkID0gZmFsc2U7XG4gIGlmIChjdXJyZW50ID09PSBudW1iZXIpIHtcbiAgICBzdGF0dXMgPSA8VGV4dCBjb2xvcj1cImdyZWVuXCI+PFNwaW5uZXIgLz48L1RleHQ+O1xuICAgIGJvbGQgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGN1cnJlbnQgPiBudW1iZXIpIHtcbiAgICBzdGF0dXMgPSA8VGV4dCBjb2xvcj1cInllbGxvd1wiPnsnXFx1MjcxMyd9PC9UZXh0PjtcbiAgfSBlbHNlIHtcbiAgICBzdGF0dXMgPSA8VGV4dD4gPC9UZXh0PjtcbiAgfVxuICByZXR1cm4gPFRleHQgYm9sZD17Ym9sZH0+IHtzdGF0dXN9IHtjaGlsZHJlbn08L1RleHQ+O1xufSJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0EsS0FBSyxRQUFRLFdBQVc7QUFDakMsU0FBU0MsSUFBSSxRQUFRLEtBQUs7QUFDMUIsT0FBT0MsVUFBVSxNQUFNLGFBQWE7QUFBQztBQUFBO0FBQUE7QUFFckMsTUFBTUMsT0FBTyxHQUFHRCxVQUFVLENBQUNFLE9BQU87QUFFbEMsZUFBZSxnQkFBZ0JDLElBQUksQ0FBQztFQUFFQztBQUFTLENBQUMsRUFBRTtFQUNoREEsUUFBUSxlQUFDLEtBQUMsSUFBSSxLQUFHLENBQUM7RUFDbEIsSUFBSUMsS0FBSyxHQUFHLENBQUM7RUFDYixtQkFBTSxLQUFDLFlBQVk7SUFBQyxLQUFLLEVBQUVBO0VBQU0sRUFBRztFQUNwQyxNQUFNQyxlQUFlLEVBQUU7RUFDdkJELEtBQUssRUFBRTtFQUNQLG1CQUFNLEtBQUMsWUFBWTtJQUFDLEtBQUssRUFBRUE7RUFBTSxFQUFHO0VBQ3BDLE1BQU1FLENBQUMsSUFBSTtFQUNYRixLQUFLLEVBQUU7RUFDUCxtQkFBTSxLQUFDLFlBQVk7SUFBQyxLQUFLLEVBQUVBO0VBQU0sRUFBRztFQUNwQyxNQUFNRyxjQUFjLEVBQUU7RUFDdEJILEtBQUssRUFBRTtFQUNQLG1CQUFNLEtBQUMsWUFBWTtJQUFDLEtBQUssRUFBRUE7RUFBTSxFQUFHO0FBQ3RDO0FBRUEsZUFBZUMsZUFBZSxHQUFHO0VBQy9CLE1BQU1SLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDbkI7QUFFQSxlQUFlUyxDQUFDLEdBQUc7RUFDakIsTUFBTVQsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNuQjtBQUVBLGVBQWVVLGNBQWMsR0FBRztFQUM5QixNQUFNVixLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ25CO0FBRUEsU0FBU1csWUFBWSxDQUFDO0VBQUVKO0FBQU0sQ0FBQyxFQUFFO0VBQy9CLG9CQUNFO0lBQUEsd0JBQ0UsS0FBQyxLQUFLO01BQUMsTUFBTSxFQUFFLENBQUU7TUFBQyxPQUFPLEVBQUVBLEtBQU07TUFBQSxVQUFDO0lBQW1CLEVBQVEsZUFDN0QsS0FBQyxLQUFLO01BQUMsTUFBTSxFQUFFLENBQUU7TUFBQyxPQUFPLEVBQUVBLEtBQU07TUFBQSxVQUFDO0lBQUcsRUFBUSxlQUM3QyxLQUFDLEtBQUs7TUFBQyxNQUFNLEVBQUUsQ0FBRTtNQUFDLE9BQU8sRUFBRUEsS0FBTTtNQUFBLFVBQUM7SUFBa0IsRUFBUTtFQUFBLEVBQzNEO0FBRVA7QUFFQSxTQUFTSyxLQUFLLENBQUM7RUFBRUMsTUFBTTtFQUFFQyxPQUFPO0VBQUVDO0FBQVMsQ0FBQyxFQUFFO0VBQzVDLElBQUlDLE1BQU07SUFBRUMsSUFBSSxHQUFHLEtBQUs7RUFDeEIsSUFBSUgsT0FBTyxLQUFLRCxNQUFNLEVBQUU7SUFDdEJHLE1BQU0sZ0JBQUcsS0FBQyxJQUFJO01BQUMsS0FBSyxFQUFDLE9BQU87TUFBQSx1QkFBQyxLQUFDLE9BQU87SUFBRyxFQUFPO0lBQy9DQyxJQUFJLEdBQUcsSUFBSTtFQUNiLENBQUMsTUFBTSxJQUFJSCxPQUFPLEdBQUdELE1BQU0sRUFBRTtJQUMzQkcsTUFBTSxnQkFBRyxLQUFDLElBQUk7TUFBQyxLQUFLLEVBQUMsUUFBUTtNQUFBLFVBQUU7SUFBUSxFQUFRO0VBQ2pELENBQUMsTUFBTTtJQUNMQSxNQUFNLGdCQUFHLEtBQUMsSUFBSTtNQUFBLFVBQUM7SUFBQyxFQUFPO0VBQ3pCO0VBQ0Esb0JBQU8sTUFBQyxJQUFJO0lBQUMsSUFBSSxFQUFFQyxJQUFLO0lBQUEsV0FBQyxHQUFDLEVBQUNELE1BQU0sRUFBQyxHQUFDLEVBQUNELFFBQVE7RUFBQSxFQUFRO0FBQ3REIn0=