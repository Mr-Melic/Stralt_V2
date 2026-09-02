// B1: mo:base migration complete.
// main.mo uses only mo:core (Map, Set, List) — no mo:base references remain in the actor.
// This module is preserved as a marker that the migration from mo:base OrderedMap/OrderedSet/List
// to mo:core Map/Set/List has been completed. All migration helper functions have been removed
// because they are no longer needed.
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // All mo:base -> mo:core migration helpers have been removed.
  // The actor state in main.mo uses mo:core collections exclusively.
  //
  // Kept as a no-op module so existing references (if any future code adds them)
  // would still compile. No mo:base imports remain in this file.

  /// Identity helper — returns a new mo:core Map containing the same entries.
  /// Retained as a utility in case future migrations are needed.
  public func cloneMap<K, V>(source : Map.Map<K, V>) : Map.Map<K, V> {
    let dest = Map.empty<K, V>();
    for ((k, v) in source.entries()) {
      dest.add(k, v);
    };
    dest;
  };

  /// Identity helper — returns a new mo:core Set containing the same elements.
  public func cloneSet<T>(source : Set.Set<T>) : Set.Set<T> {
    let dest = Set.empty<T>();
    for (item in source.elements()) {
      dest.add(item);
    };
    dest;
  };

  /// Identity helper — returns a new mo:core List containing the same elements.
  public func cloneList<T>(source : List.List<T>) : List.List<T> {
    let dest = List.empty<T>();
    for (item in source.values()) {
      dest.add(item);
    };
    dest;
  };
};
