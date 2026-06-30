import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUser, UserContext } from '../../src/contexts/UserContext';

describe('UserContext', () => {
  it('provides default values when no provider is used', () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.username).toBeNull();
    expect(typeof result.current.setUsername).toBe('function');
    expect(typeof result.current.clearUsername).toBe('function');
  });

  it('setUsername updates the username', () => {
    const setUsername = vi.fn();
    const clearUsername = vi.fn();

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => (
        <UserContext.Provider
          value={{ username: null, setUsername, clearUsername }}
        >
          {children}
        </UserContext.Provider>
      ),
    });

    act(() => {
      result.current.setUsername('testuser');
    });

    expect(setUsername).toHaveBeenCalledWith('testuser');
  });

  it('clearUsername resets username to null', () => {
    const setUsername = vi.fn();
    const clearUsername = vi.fn();

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => (
        <UserContext.Provider
          value={{ username: 'testuser', setUsername, clearUsername }}
        >
          {children}
        </UserContext.Provider>
      ),
    });

    act(() => {
      result.current.clearUsername();
    });

    expect(clearUsername).toHaveBeenCalled();
  });

  it('provides the correct username from context', () => {
    const setUsername = vi.fn();
    const clearUsername = vi.fn();

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => (
        <UserContext.Provider
          value={{ username: 'activeuser', setUsername, clearUsername }}
        >
          {children}
        </UserContext.Provider>
      ),
    });

    expect(result.current.username).toBe('activeuser');
  });
});