<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<AvatarPrimitive.FallbackProps> & { children?: Snippet } = $props();
</script>

<AvatarPrimitive.Fallback
	bind:ref
	data-slot="avatar-fallback"
	class={cn(
		"bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-full",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Fallback>
