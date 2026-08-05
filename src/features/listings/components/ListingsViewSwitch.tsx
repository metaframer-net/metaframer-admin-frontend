import { ViewSwitch, parseDataView, DATA_VIEWS, type DataView } from '@/components/data-table/ViewSwitch';

export const LISTING_VIEWS = DATA_VIEWS;
export type ListingView = DataView;
export const parseListingView = (raw: string | undefined) => parseDataView(raw, LISTING_VIEWS);

export interface ListingsViewSwitchProps {
  value: ListingView;
  onChange: (view: ListingView) => void;
}

/** Listings-specific view switcher — delegates to the shared ViewSwitch. */
export function ListingsViewSwitch({ value, onChange }: ListingsViewSwitchProps) {
  return <ViewSwitch value={value} onChange={onChange} entity="listing" />;
}
